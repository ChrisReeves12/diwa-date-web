import ConsoleCommand from "@/console/commands/console.command";
import pgDbPool from "@/lib/postgres";
import { Command } from "commander";
import { chargeCustomerByBillingEntry } from "@/server-side-helpers/billing.helpers";
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

                    if (user.price > 0) {
                        paymentTxnResult = await chargeCustomerByBillingEntry(user.billingEntryId, user.price, user.planName);
                        paymentSucceeded = paymentTxnResult?.authorizeNetResponse?.transactionResponse?.responseCode === '1';
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
                            const receiptHtml = this.generateReceiptHtml({
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
                        const responseCode = paymentTxnResult?.authorizeNetResponse?.transactionResponse?.responseCode;

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
                            const paymentReviewHtml = this.generatePaymentReviewEmail({
                                customerEmail: user.email,
                                planName: user.planName,
                                reviewDate: receiptDate,
                                receiptPayMethod
                            });

                            await sendEmail([user.email], `Notice: Payment under review for your Diwa Date membership`, paymentReviewHtml);
                        } else {
                            // If the payment was declined for other reasons, remove subscription
                            await pgDbPool.query(`DELETE FROM "subscriptionPlanEnrollments" WHERE id = $1`, [user.enrollmentId]);

                            // Send billing failure email to customer
                            const billingFailureHtml = this.generateBillingFailureEmail({
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

    private generateReceiptHtml(params: {
        receiptNo: string;
        receiptDate: string;
        customerEmail: string;
        planName: string;
        receiptPaidForTime: string;
        receiptTotal: string;
        receiptAmountPaid: string;
        receiptPayMethod: string;
    }): string {
        const {
            receiptNo,
            receiptDate,
            customerEmail,
            planName,
            receiptPaidForTime,
            receiptTotal,
            receiptAmountPaid,
            receiptPayMethod
        } = params;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Receipt</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
                    .receipt-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
                    .header p { margin: 5px 0 0 0; opacity: 0.9; }
                    .content { padding: 30px; padding-top: 15px; }
                    .receipt-info { background: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 25px; }
                    .receipt-info h2 { margin: 0 0 15px 0; color: #333; font-size: 18px; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .info-label { font-weight: 600; color: #666; }
                    .info-value { color: #333; padding-left: 8px; }
                    .transaction-details { border-top: 2px solid #e9ecef; padding-top: 20px; }
                    .transaction-details h3 { margin: 0 0 15px 0; color: #333; }
                    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e9ecef; }
                    .item-details { flex: 1; }
                    .item-name { font-weight: 600; color: #333; margin-bottom: 5px; }
                    .item-period { color: #666; font-size: 14px; }
                    .item-price { font-weight: 600; color: #333; font-size: 18px; }
                    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 2px solid #333; margin-top: 15px; }
                    .total-label { font-weight: 600; font-size: 18px; color: #333; }
                    .total-amount { font-weight: 700; font-size: 22px; color: #0092e4; line-height: 27px; padding-left: 8px; }
                    .payment-method { background: #edfaff; border-radius: 6px; padding: 15px; margin-top: 20px; }
                    .payment-method h4 { margin: 0 0 10px 0; color: #0092e4; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="content">
                        <h1>Payment Receipt</h1>
                        <div class="receipt-info">
                            <h2>Receipt Details</h2>
                            <div class="info-row">
                                <span class="info-label">Receipt Number:</span>
                                <span class="info-value">#${receiptNo}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Date:</span>
                                <span class="info-value">${receiptDate}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Customer Email:</span>
                                <span class="info-value">${customerEmail}</span>
                            </div>
                        </div>
                        
                        <div class="transaction-details">
                            <h3>Transaction Details</h3>
                            
                            <div class="item-row">
                                <div class="item-details">
                                    <div class="item-name">${planName} Membership</div>
                                    <div class="item-period">Service Period: ${receiptPaidForTime}</div>
                                </div>
                                <div class="item-price">$${receiptTotal}</div>
                            </div>
                            
                            <div class="total-row">
                                <span class="total-label">Total Paid:</span>
                                <span class="total-amount">$${receiptAmountPaid}</span>
                            </div>
                            
                            <div class="payment-method">
                                <h4>Payment Method</h4>
                                <p style="margin: 0; color: #333;">${receiptPayMethod}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Thank you for your subscription to Diwa Date, where you deserve to be loved!</p>
                        <p>If you have any questions about this receipt, please contact our support team at support@diwadate.com.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private generateBillingFailureEmail(params: {
        customerEmail: string;
        planName: string;
        failureDate: string;
        receiptPayMethod: string;
    }): string {
        const {
            customerEmail,
            planName,
            failureDate,
            receiptPayMethod
        } = params;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Notice of Payment Failure</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
                    .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
                    .header { background-color: #0092e4; color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
                    .header p { margin: 5px 0 0 0; opacity: 0.9; }
                    .content { padding: 30px; }
                    .alert-badge { background: #ffc107; color: #856404; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 20px; }
                    .message-section { background: #f8f9fa; border-radius: 6px; padding: 25px; margin-bottom: 25px; }
                    .message-section h2 { margin: 0 0 15px 0; color: #0092e4; font-size: 20px; }
                    .message-section p { margin: 0 0 15px 0; color: #555; line-height: 1.7; }
                    .message-section p:last-child { margin-bottom: 0; }
                    .details-section { border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px; }
                    .details-section h3 { margin: 0 0 15px 0; color: #333; }
                    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .detail-label { font-weight: 600; color: #666; }
                    .detail-value { color: #333; padding-left: 8px; }
                    .action-section { background: rgb(233, 247, 255); border-radius: 6px; padding: 20px; margin-bottom: 25px; }
                    .action-section h3 { margin: 0 0 15px 0; color: #0092e4; }
                    .action-section strong { color: #0092e4; }
                    .action-section p { margin: 0 0 10px 0; color: #555; }
                    .cta-button { display: inline-block; background: #0092e4; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px; }
                    .cta-button:hover { text-decoration: none; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }
                    .footer p { margin: 5px 0; }
                    .highlight { color: #dc3545; font-weight: 600; }
                    .success { color: #0092e4;; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="content"> 
                        <div class="message-section">
                            <h2>Notice of Payment Failure</h2>
                            <p>Hello,</p>
                            <p>We attempted to process your <strong>${planName} Membership</strong> renewal on <strong>${failureDate}</strong>, but unfortunately, the payment could not be completed.</p>
                            <p>As a result, your account has been automatically switched to our <span class="success">Free Membership</span>.</p>
                        </div>
                        
                        <div class="details-section">
                            <h3>Payment Attempt Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Account: </span>
                                <span class="detail-value">${customerEmail}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Previous Plan: </span>
                                <span class="detail-value">${planName} Membership</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Method: </span>
                                <span class="detail-value">${receiptPayMethod}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Attempt Date: </span>
                                <span class="detail-value">${failureDate}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Current Status: </span>
                                <span class="detail-value success">Free Membership</span>
                            </div>
                        </div>
                        
                        <div class="action-section">
                            <h3>Want to restore your ${planName} Membership?</h3>
                            <p>You can easily reactivate your <strong>${planName} Membership</strong> by updating your payment information.</p>
                            <p>Common reasons for payment failures include:</p>
                            <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
                                <li>Expired credit card</li>
                                <li>Insufficient funds</li>
                                <li>Card issuer security restrictions</li>
                                <li>Outdated billing information</li>
                            </ul>
                            <a href="${process.env.APP_URL_ROOT}/account/billing" class="cta-button">Update Payment Method</a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Need help?</strong> Our support team is here to assist you.</p>
                        <p>Contact us at support@diwadate.com or visit our help center.</p>
                        <p>Thank you for being part of the Diwa Date community, where you deserve to be loved!</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private generatePaymentReviewEmail(params: {
        customerEmail: string;
        planName: string;
        reviewDate: string;
        receiptPayMethod: string;
    }): string {
        const {
            customerEmail,
            planName,
            reviewDate,
            receiptPayMethod
        } = params;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Under Review</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
                    .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
                    .header { background-color: #0092e4; color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
                    .header p { margin: 5px 0 0 0; opacity: 0.9; }
                    .content { padding: 30px; }
                    .alert-badge { background: #ffc107; color: #856404; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 20px; }
                    .message-section { background: #f8f9fa; border-radius: 6px; padding: 25px; margin-bottom: 25px; }
                    .message-section h2 { margin: 0 0 15px 0; color: #0092e4; font-size: 20px; }
                    .message-section p { margin: 0 0 15px 0; color: #555; line-height: 1.7; }
                    .message-section p:last-child { margin-bottom: 0; }
                    .details-section { border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 25px; }
                    .details-section h3 { margin: 0 0 15px 0; color: #333; }
                    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .detail-label { font-weight: 600; color: #666; }
                    .detail-value { color: #333; padding-left: 8px; }
                    .action-section { background: rgb(255, 248, 220); border-radius: 6px; padding: 20px; margin-bottom: 25px; }
                    .action-section h3 { margin: 0 0 15px 0; color: #856404; }
                    .action-section strong { color: #856404; }
                    .action-section p { margin: 0 0 10px 0; color: #555; }
                    .cta-button { display: inline-block; background: #0092e4; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px; }
                    .cta-button:hover { text-decoration: none; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }
                    .footer p { margin: 5px 0; }
                    .highlight { color: #dc3545; font-weight: 600; }
                    .success { color: #0092e4; font-weight: 600; }
                    .warning { color: #856404; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="content">
                        <div class="alert-badge">UNDER REVIEW</div>
                        
                        <div class="message-section">
                            <h2>Payment Under Review</h2>
                            <p>Hello,</p>
                            <p>We attempted to process your <strong>${planName} Membership</strong> renewal on <strong>${reviewDate}</strong>. Your payment is currently <span class="warning">under review</span> by our payment processor.</p>
                            <p>Your <strong>${planName} Membership</strong> will remain active while we review your payment. This review process typically takes 1-3 business days.</p>
                        </div>
                        
                        <div class="details-section">
                            <h3>Payment Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Account: </span>
                                <span class="detail-value">${customerEmail}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Plan: </span>
                                <span class="detail-value">${planName} Membership</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Method: </span>
                                <span class="detail-value">${receiptPayMethod}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Review Date: </span>
                                <span class="detail-value">${reviewDate}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Current Status: </span>
                                <span class="detail-value success">Active (Under Review)</span>
                            </div>
                        </div>
                        
                        <div class="action-section">
                            <h3>What happens next?</h3>
                            <p>Our payment processor will review your transaction within 1-3 business days. During this time:</p>
                            <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
                                <li>Your membership remains fully active</li>
                                <li>You can continue using all premium features</li>
                                <li>We'll email you once the review is complete</li>
                                <li>No action is required from you at this time</li>
                            </ul>
                            <p>If you have any concerns, you can update your payment information or contact our support team.</p>
                            <a href="${process.env.APP_URL_ROOT}/account/billing" class="cta-button">View Billing Information</a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Questions?</strong> Our support team is here to help.</p>
                        <p>Contact us at support@diwadate.com or visit our help center.</p>
                        <p>Thank you for your patience and for being part of the Diwa Date community!</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}
