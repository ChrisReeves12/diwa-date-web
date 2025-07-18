import ConsoleCommand from "@/console/commands/console.command";
import pgDbPool from "@/lib/postgres";
import { Command } from "commander";
import { chargeCustomerByBillingEntry, generateReceiptHtml, generatePaymentReviewEmail, generateBillingFailureEmail } from "@/server-side-helpers/billing.helpers";
import { sendEmail } from "@/server-side-helpers/mail.helper";
import moment from "moment";

export default class EvalUserSubscriptionsCommand extends ConsoleCommand {
    constructor() {
        super('users:evaluate-subscriptions', 'Evaluate subscriptions for users and manage billing', [
            {
                option: '-u, --users <users>',
                description: 'Comma-delimited user IDs to process',
                required: false
            }
        ]);
    }

    async handle(prog: Command): Promise<number> {
        const batchSize = 1000;

        while (true) {
            const users = await pgDbPool.query(
                `SELECT DISTINCT ON (u.id)
                    spe."id" as "enrollmentId",  
                    spe."lastPaymentAt",
                    spe."nextPaymentAt",
                    spe."endsAt",
                    bie.id as "billingEntryId",
                    spe."price",
                    sp."name" as "planName",
                    spe."priceUnit",
                    spe."subscriptionPlanId",
                    CASE WHEN DATE(spe."endsAt") <= CURRENT_DATE THEN 'expired' ELSE 'active' END as "subscriptionStatus",
                    u.* 
                FROM "users" u 
                INNER JOIN "subscriptionPlanEnrollments" spe ON u.id = spe."userId"
                INNER JOIN "subscriptionPlans" sp ON spe."subscriptionPlanId" = sp.id
                LEFT JOIN "billingInformationEntries" bie ON bie."userId" = u.id
                WHERE u."suspendedAt" IS NULL 
                AND DATE(spe."nextPaymentAt") <= CURRENT_DATE
                AND (spe."lastEvalAt" IS NULL OR spe."lastEvalAt" < (CURRENT_TIMESTAMP - INTERVAL '1 day'))
                LIMIT ${batchSize}`,
            );

            if (users.rows.length === 0) {
                break;
            }

            for (const user of users.rows) {
                console.log(`Evaluating subscription for user ${user.id} (${user.email})`);
                if (user.subscriptionStatus === 'expired' || !user.billingEntryId) {
                    await pgDbPool.query(`DELETE FROM "subscriptionPlanEnrollments" WHERE "id" = $1`, [user.enrollmentId]);
                } else {
                    let paymentSucceeded = false;
                    let paymentTxnResult;
                    let responseCode;

                    if (user.price > 0) {
                        paymentTxnResult = await chargeCustomerByBillingEntry(user.billingEntryId, user.price, user.planName);
                        responseCode = paymentTxnResult?.authorizeNetResponse?.transactionResponse?.responseCode;
                        paymentSucceeded = responseCode === '1';
                    } else {
                        paymentSucceeded = true;
                    }

                    const receiptNo = paymentTxnResult?.paymentTransaction?.transId;
                    const receiptTotal = Number(user.price || 0).toFixed(2);
                    const receiptAmountPaid = Number(paymentTxnResult?.paymentTransaction?.amount || 0).toFixed(2);
                    const receiptDate = moment().format('MMMM DD, YYYY');
                    const receiptPaidForTime = `${receiptDate} - ${moment().add(1, 'month').format('MMMM DD, YYYY')}`;

                    let receiptPayMethod = 'Credit/Debit Card';

                    if (paymentTxnResult?.authorizeNetResponse?.transactionResponse?.accountType &&
                        paymentTxnResult?.authorizeNetResponse?.transactionResponse?.accountNumber) {
                        receiptPayMethod = `${paymentTxnResult.authorizeNetResponse.transactionResponse.accountType} - ${paymentTxnResult.authorizeNetResponse.transactionResponse.accountNumber}`;
                    }

                    if (paymentSucceeded) {
                        await pgDbPool
                            .query(`UPDATE "subscriptionPlanEnrollments" 
                                    SET "lastPaymentAt" = CURRENT_DATE, 
                                        "lastEvalAt" = CURRENT_TIMESTAMP,
                                        "updatedAt" = CURRENT_TIMESTAMP,
                                        "nextPaymentAt" = CURRENT_DATE + INTERVAL '1 month' 
                                WHERE "id" = $1`, [user.enrollmentId]);

                        // Send receipt email to customer
                        if (receiptNo) {
                            const receiptHtml = generateReceiptHtml({
                                receiptNo,
                                receiptDate,
                                customerEmail: user.email,
                                planName: user.planName,
                                receiptPaidForTime,
                                receiptTotal,
                                receiptAmountPaid,
                                receiptPayMethod
                            });

                            await sendEmail([user.email], `Your receipt from Diwa Date [#${receiptNo}]`, receiptHtml);
                            return 0;
                        }
                    } else {
                        // Payment is under review
                        if (responseCode === '4') {
                            await pgDbPool.query(`
                                INSERT INTO "billingHolds" ("userId", "enrollmentId", "reason", "responseCode", "amount", "planName", "createdAt", "updatedAt")
                                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            `, [user.id, user.enrollmentId, 'Payment under review', responseCode, user.price, user.planName]);

                            // Update lastEvalAt to 2 days from current date
                            await pgDbPool.query(`
                                UPDATE "subscriptionPlanEnrollments" 
                                SET "lastEvalAt" = CURRENT_TIMESTAMP + INTERVAL '2 days',
                                    "updatedAt" = CURRENT_TIMESTAMP
                                WHERE "id" = $1
                            `, [user.enrollmentId]);

                            // Send payment review email
                            const paymentReviewHtml = generatePaymentReviewEmail({
                                customerEmail: user.email,
                                planName: user.planName,
                                reviewDate: receiptDate,
                                receiptPayMethod
                            });

                            await sendEmail([user.email], `Notice: Payment under review for your Diwa Date membership`, paymentReviewHtml);
                        } else {
                            // If the payment was declined for other reasons, remove subscription
                            await pgDbPool.query(`DELETE FROM "subscriptionPlanEnrollments" WHERE id = $1`, [user.enrollmentId]);

                            const billingFailureHtml = generateBillingFailureEmail({
                                customerEmail: user.email,
                                planName: user.planName,
                                failureDate: receiptDate,
                                receiptPayMethod
                            });

                            await sendEmail([user.email], `Notice: Payment failure for your Diwa Date membership`, billingFailureHtml);
                        }
                    }
                }

                console.log(`Evaluated user ${user.id} (${user.email})`);
            }
        }

        return 0;
    }
}
