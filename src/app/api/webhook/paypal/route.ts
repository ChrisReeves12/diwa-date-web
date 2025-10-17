import pgDbWritePool, { pgDbReadPool } from '@/lib/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body: any = await request.json();
        console.log(`Webhook: PayPal Event Type: ${body.event_type}`);

        switch (body.event_type) {
            case 'BILLING.SUBSCRIPTION.CANCELLED': {
                const subscriptionPlanEnrollmentId = await pgDbReadPool.query(`
                    SELECT "id", "userId" FROM "subscriptionPlanEnrollments"
                    WHERE "paypalSubscriptionId" = $1
                `, [body.resource.id]);

                if (subscriptionPlanEnrollmentId.rows.length === 0) {
                    console.log(`Webhook: Subscription plan enrollment not found: ${body.resource.id}`);
                    return NextResponse.json({ message: 'Subscription plan enrollment not found' }, { status: 404 });
                }

                const subscriptionPlanEnrollment = subscriptionPlanEnrollmentId.rows[0];

                // Delete the enrollment record
                await pgDbWritePool.query(`
                    DELETE FROM "subscriptionPlanEnrollments" 
                    WHERE "id" = $1
                `, [subscriptionPlanEnrollment.id]);

                // Update the user's isPremium and isFoundingMember to false
                await pgDbWritePool.query(`
                    UPDATE "users" 
                    SET "isPremium" = false, "isFoundingMember" = false, "updatedAt" = NOW() 
                    WHERE id = $1
                `, [subscriptionPlanEnrollment.userId]);

                console.log(`Webhook: Subscription cancelled and deleted successfully: ${body.resource.id}`);
                return NextResponse.json({ message: 'Subscription cancelled successfully' }, { status: 200 });
            }

            case 'BILLING.SUBSCRIPTION.SUSPENDED': {
                const suspendEnrollmentResult = await pgDbReadPool.query(`
                    SELECT "id", "userId", "endsAt", "nextPaymentAt" FROM "subscriptionPlanEnrollments"
                    WHERE "paypalSubscriptionId" = $1
                `, [body.resource.id]);

                if (suspendEnrollmentResult.rows.length === 0) {
                    console.log(`Webhook: Subscription plan enrollment not found: ${body.resource.id}`);
                    return NextResponse.json({ message: 'Subscription plan enrollment not found' }, { status: 404 });
                }

                const suspendEnrollment = suspendEnrollmentResult.rows[0];

                // Only update if the subscription is not already suspended
                if (suspendEnrollment.endsAt === null) {
                    // Set endsAt to nextPaymentAt to allow user to use service until next billing date
                    await pgDbWritePool.query(`
                        UPDATE "subscriptionPlanEnrollments" 
                        SET "endsAt" = $2, "updatedAt" = NOW()
                        WHERE "id" = $1
                    `, [suspendEnrollment.id, suspendEnrollment.nextPaymentAt]);

                    console.log(`Webhook: Subscription suspended successfully: ${body.resource.id}`);
                } else {
                    console.log(`Webhook: Subscription already suspended, no update needed: ${body.resource.id}`);
                }

                return NextResponse.json({ message: 'Subscription suspended successfully' }, { status: 200 });
            }

            case 'BILLING.SUBSCRIPTION.ACTIVATED': {
                const enrollmentResult = await pgDbReadPool.query(`
                    SELECT "id", "userId", "endsAt" FROM "subscriptionPlanEnrollments"
                    WHERE "paypalSubscriptionId" = $1
                `, [body.resource.id]);

                if (enrollmentResult.rows.length === 0) {
                    console.error(`Webhook: Cannot reactivate - subscription plan enrollment not found: ${body.resource.id}`);
                    return NextResponse.json({ message: 'Subscription plan enrollment not found' }, { status: 404 });
                }

                const enrollment = enrollmentResult.rows[0];

                // Only update if the subscription is currently cancelled (endsAt is not null)
                if (enrollment.endsAt !== null) {
                    const nextBillingDate = body.resource.agreement_details?.next_billing_date
                        ? new Date(body.resource.agreement_details.next_billing_date)
                        : null;

                    // Reactivate the enrollment
                    await pgDbWritePool.query(`
                        UPDATE "subscriptionPlanEnrollments" 
                        SET "endsAt" = NULL, 
                            "nextPaymentAt" = $2,
                            "updatedAt" = NOW()
                        WHERE "id" = $1
                    `, [enrollment.id, nextBillingDate]);

                    // Update the user's isPremium to true
                    await pgDbWritePool.query(`
                        UPDATE "users" 
                        SET "isPremium" = true, "updatedAt" = NOW() 
                        WHERE id = $1 AND "isPremium" = false
                    `, [enrollment.userId]);

                    console.log(`Webhook: Subscription reactivated successfully: ${body.resource.id}`);
                } else {
                    console.log(`Webhook: Subscription already active, no update needed: ${body.resource.id}`);
                }

                return NextResponse.json({ message: 'Subscription reactivated successfully' }, { status: 200 });
            }

            case 'PAYMENT.SALE.COMPLETED': {
                // For subscription payments, the resource contains a billing_agreement_id
                const billingAgreementId = body.resource.billing_agreement_id;

                if (!billingAgreementId) {
                    console.log('Webhook: No billing agreement ID in payment sale, skipping');
                    return NextResponse.json({ message: 'Not a subscription payment' }, { status: 200 });
                }

                // Find the subscription enrollment by PayPal subscription ID
                const paymentEnrollmentResult = await pgDbReadPool.query(`
                    SELECT "id", "userId", "nextPaymentAt" FROM "subscriptionPlanEnrollments"
                    WHERE "paypalSubscriptionId" = $1
                `, [billingAgreementId]);

                if (paymentEnrollmentResult.rows.length === 0) {
                    console.log(`Webhook: Subscription enrollment not found for billing agreement: ${billingAgreementId}`);
                    return NextResponse.json({ message: 'Subscription enrollment not found' }, { status: 404 });
                }

                const paymentEnrollment = paymentEnrollmentResult.rows[0];
                const saleId = body.resource.id;
                const amount = parseFloat(body.resource.amount.total);
                const currency = body.resource.amount.currency;

                // Check if this transaction already exists (idempotency)
                const existingTransaction = await pgDbReadPool.query(`
                    SELECT id FROM "paymentTransactions"
                    WHERE "transId" = $1
                `, [saleId]);

                if (existingTransaction.rows.length > 0) {
                    console.log(`Webhook: Payment transaction already exists: ${saleId}`);
                    return NextResponse.json({ message: 'Payment already recorded' }, { status: 200 });
                }

                // Create payment transaction record
                await pgDbWritePool.query(`
                    INSERT INTO "paymentTransactions" (
                        "userId", "amount", "transId", "accountNumber", 
                        "description", "status", "paymentMethod", 
                        "apiResponse", "createdAt", "updatedAt"
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    paymentEnrollment.userId,
                    amount,
                    saleId,
                    null, // No account number for PayPal
                    `PayPal subscription payment - ${currency} ${amount.toFixed(2)}`,
                    body.resource.state, // e.g., 'completed'
                    'paypal',
                    JSON.stringify(body),
                    new Date(),
                    new Date()
                ]);

                // Update subscription enrollment: set lastPaymentAt and calculate nextPaymentAt
                const currentPaymentDate = new Date();
                const nextPaymentDate = new Date(currentPaymentDate);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

                await pgDbWritePool.query(`
                    UPDATE "subscriptionPlanEnrollments" 
                    SET "lastPaymentAt" = $2, 
                        "nextPaymentAt" = $3,
                        "updatedAt" = NOW()
                    WHERE "id" = $1
                `, [paymentEnrollment.id, currentPaymentDate, nextPaymentDate]);

                console.log(`Webhook: Payment recorded successfully for user ${paymentEnrollment.userId}: ${saleId}`);
                return NextResponse.json({ message: 'Payment recorded successfully' }, { status: 200 });
            }

            case 'PAYMENT.SALE.REVERSED': {
                const reversedSaleId = body.resource.id;

                // Find the original payment transaction
                const reversedTransactionResult = await pgDbReadPool.query(`
                    SELECT "id", "userId" FROM "paymentTransactions"
                    WHERE "transId" = $1
                `, [reversedSaleId]);

                if (reversedTransactionResult.rows.length === 0) {
                    console.log(`Webhook: Payment transaction not found for reversal: ${reversedSaleId}`);
                    return NextResponse.json({ message: 'Payment transaction not found' }, { status: 404 });
                }

                const reversedTransaction = reversedTransactionResult.rows[0];

                // Update the transaction status to reversed
                await pgDbWritePool.query(`
                    UPDATE "paymentTransactions"
                    SET "status" = $2,
                        "updatedAt" = NOW(),
                        "apiResponse" = $3
                    WHERE "id" = $1
                `, [
                    reversedTransaction.id,
                    'reversed',
                    JSON.stringify(body)
                ]);

                console.log(`Webhook: Payment reversed for transaction: ${reversedSaleId}, user: ${reversedTransaction.userId}`);
                return NextResponse.json({ message: 'Payment reversal recorded successfully' }, { status: 200 });
            }

            case 'PAYMENT.SALE.REFUNDED': {
                // The parent_payment field contains the original sale ID
                const refundedSaleId = body.resource.sale_id || body.resource.parent_payment;

                if (!refundedSaleId) {
                    console.log('Webhook: No sale ID found in refund webhook');
                    return NextResponse.json({ message: 'Sale ID not found' }, { status: 400 });
                }

                // Find the original payment transaction
                const refundedTransactionResult = await pgDbReadPool.query(`
                    SELECT "id", "userId" FROM "paymentTransactions"
                    WHERE "transId" = $1
                `, [refundedSaleId]);

                if (refundedTransactionResult.rows.length === 0) {
                    console.log(`Webhook: Payment transaction not found for refund: ${refundedSaleId}`);
                    return NextResponse.json({ message: 'Payment transaction not found' }, { status: 404 });
                }

                const refundedTransaction = refundedTransactionResult.rows[0];

                // Update the transaction status to refunded
                await pgDbWritePool.query(`
                    UPDATE "paymentTransactions"
                    SET "status" = $2,
                        "updatedAt" = NOW(),
                        "apiResponse" = $3
                    WHERE "id" = $1
                `, [
                    refundedTransaction.id,
                    'refunded',
                    JSON.stringify(body)
                ]);

                console.log(`Webhook: Payment refunded for transaction: ${refundedSaleId}, user: ${refundedTransaction.userId}`);
                return NextResponse.json({ message: 'Payment refund recorded successfully' }, { status: 200 });
            }

            case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
                const failedSubscriptionId = body.resource.id;

                // Find the subscription enrollment
                const failedEnrollmentResult = await pgDbReadPool.query(`
                    SELECT spe.id, spe."userId", spe."price", spe."priceUnit", sp.name as "planName"
                    FROM "subscriptionPlanEnrollments" spe
                    JOIN "subscriptionPlans" sp ON sp.id = spe."subscriptionPlanId"
                    WHERE spe."paypalSubscriptionId" = $1
                `, [failedSubscriptionId]);

                if (failedEnrollmentResult.rows.length === 0) {
                    console.log(`Webhook: Subscription enrollment not found for failed payment: ${failedSubscriptionId}`);
                    return NextResponse.json({ message: 'Subscription enrollment not found' }, { status: 404 });
                }

                const failedEnrollment = failedEnrollmentResult.rows[0];

                // Extract failure reason from the webhook
                const failureReason = body.resource.status_details?.reason ||
                    body.resource.billing_info?.failed_payments_count > 0 ?
                    'Payment failed - insufficient funds or payment method issue' :
                    'Payment failed';

                // Generate a unique transaction ID for the failed payment
                const failedTransId = `FAILED-${failedSubscriptionId}-${Date.now()}`;

                // Check if a payment transaction already exists for this failed payment (idempotency)
                const existingFailedTransaction = await pgDbReadPool.query(`
                    SELECT id FROM "paymentTransactions"
                    WHERE "userId" = $1 
                    AND "status" = 'failed'
                    AND "description" LIKE $2
                    AND "createdAt" > NOW() - INTERVAL '1 hour'
                    LIMIT 1
                `, [failedEnrollment.userId, `%${failedSubscriptionId}%`]);

                if (existingFailedTransaction.rows.length === 0) {
                    // Create payment transaction record for the failed payment
                    await pgDbWritePool.query(`
                        INSERT INTO "paymentTransactions" (
                            "userId", "amount", "transId", "accountNumber", 
                            "description", "status", "paymentMethod", 
                            "errors", "apiResponse", "createdAt", "updatedAt"
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                    `, [
                        failedEnrollment.userId,
                        failedEnrollment.price,
                        failedTransId,
                        null, // No account number for PayPal
                        `PayPal subscription payment failed`,
                        'failed',
                        'paypal',
                        JSON.stringify([{ errorCode: 'PAYMENT_FAILED', errorText: failureReason }]),
                        JSON.stringify(body),
                    ]);

                    console.log(`Webhook: Failed payment transaction recorded: ${failedTransId}, user: ${failedEnrollment.userId}`);
                }

                // Check if a billing hold already exists for this subscription
                const existingHoldResult = await pgDbReadPool.query(`
                    SELECT id FROM "billingHolds"
                    WHERE "enrollmentId" = $1 
                    AND "status" = 'pending'
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                `, [failedEnrollment.id]);

                if (existingHoldResult.rows.length === 0) {
                    // Create a billing hold record
                    await pgDbWritePool.query(`
                        INSERT INTO "billingHolds" (
                            "userId", "enrollmentId", "reason", "responseCode", 
                            "amount", "planName", "status", "createdAt", "updatedAt"
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                    `, [
                        failedEnrollment.userId,
                        failedEnrollment.id,
                        failureReason,
                        'FAILED', // Response code for PayPal failures
                        failedEnrollment.price,
                        failedEnrollment.planName,
                        'pending'
                    ]);

                    console.log(`Webhook: Billing hold created for failed payment: ${failedSubscriptionId}, user: ${failedEnrollment.userId}`);
                } else {
                    console.log(`Webhook: Billing hold already exists for subscription: ${failedSubscriptionId}`);
                }

                return NextResponse.json({ message: 'Payment failure recorded successfully' }, { status: 200 });
            }

            default:
                return NextResponse.json({ message: 'Webhook received' }, { status: 200 });
        }
    } catch (error) {
        console.error('Webhook: PayPal webhook error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}