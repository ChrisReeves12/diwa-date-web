'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { prismaRead, prismaWrite } from "@/lib/prisma";
import { pgDbReadPool, pgDbWritePool } from "@/lib/postgres";
import { revalidatePath } from "next/cache";
import {
    createCustomerProfileWithPayment,
    deleteCustomerProfile,
    getCustomerPaymentProfile,
    chargeCustomerByBillingEntry,
    generateReceiptHtml,
    generatePaymentReviewEmail, fetchRegionsForCountry
} from "@/server-side-helpers/billing.helpers";
import { suspendPayPalSubscription, createPayPalSubscription, verifyPayPalSubscription, activatePayPalSubscription, cancelPayPalSubscription } from "@/server-side-helpers/paypal.helpers";
import { sendEmail } from "@/server-side-helpers/mail.helper";
import moment from "moment";
import { isPostalCodeRequired as isPostalCodeRequiredUtil } from "@/utils/postal-code-utils";

/**
 * Check if a country requires a postal code (async version for server actions)
 * @param countryNameOrCode - The country name or ISO 2-letter country code
 * @returns true if postal code is required, false otherwise
 */
async function isPostalCodeRequired(countryNameOrCode: string): Promise<boolean> {
    // If it's a 2-letter code, use it directly
    if (countryNameOrCode.length === 2) {
        return isPostalCodeRequiredUtil(countryNameOrCode);
    }

    // Otherwise, try to find the country code from the name
    const { countries } = await import('@/config/countries');
    const country = countries.find(c => c.name === countryNameOrCode);

    if (country) {
        return isPostalCodeRequiredUtil(country.code);
    }

    // Default to false if country not found
    return false;
}

export interface BillingInformation {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
}


/**
 * Updates the user's billing information
 * @param billingInfo The billing information to save
 * @returns Success status and any error messages
 */
export async function updateBillingInformation(billingInfo: BillingInformation) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Validate required fields
        if (!billingInfo.name?.trim()) {
            return { success: false, error: "Name is required" };
        }
        if (!billingInfo.address1?.trim()) {
            return { success: false, error: "Address is required" };
        }
        if (!billingInfo.city?.trim()) {
            return { success: false, error: "City is required" };
        }
        if (!billingInfo.region?.trim()) {
            return { success: false, error: "State/Region is required" };
        }
        if (await isPostalCodeRequired(billingInfo.country) && !billingInfo.postalCode?.trim()) {
            return { success: false, error: "Postal code is required" };
        }
        if (!billingInfo.country?.trim()) {
            return { success: false, error: "Country is required" };
        }

        // Check if user already has billing information
        const existingBilling = await prismaRead.billingInformationEntries.findFirst({
            where: { userId: currentUser.id }
        });

        const billingData = {
            userId: currentUser.id,
            name: billingInfo.name.trim(),
            address1: billingInfo.address1.trim(),
            address2: billingInfo.address2?.trim() || null,
            city: billingInfo.city.trim(),
            region: billingInfo.region.trim(),
            postalCode: billingInfo.postalCode.trim(),
            country: billingInfo.country,
            paymentMethod: existingBilling?.paymentMethod || '',
            cclast4: existingBilling?.cclast4 || '',
            updatedAt: new Date()
        };

        if (existingBilling) {
            // Update existing billing information
            await prismaWrite.billingInformationEntries.update({
                where: { id: existingBilling.id },
                data: billingData
            });
        } else {
            // Create new billing information
            await prismaWrite.billingInformationEntries.create({
                data: {
                    ...billingData,
                    createdAt: new Date()
                }
            });
        }

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('Billing information update error:', error);
        return { success: false, error: "Failed to update billing information. Please try again." };
    }
}

/**
 * Get list of states for the given country
 * @param country
 */
export async function getRegionsForCountry(country: string) {
    return fetchRegionsForCountry(country);
}

/**
 * Initiates a PayPal subscription by creating it via API and returning the approval URL
 * @param planId Internal plan ID
 * @returns Success status, approval URL, and any error messages
 */
export async function initiatePayPalSubscription(planId: number) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Get the subscription plan with PayPal plan ID
        const { rows: planRows } = await pgDbReadPool.query(`
            SELECT id, name, "listPrice", "listPriceUnit", "paypalPlanId" 
            FROM "subscriptionPlans" 
            WHERE id = $1
        `, [planId]);

        if (planRows.length === 0) {
            return { success: false, error: "Subscription plan not found" };
        }

        const subscriptionPlan = planRows[0];

        if (!subscriptionPlan.paypalPlanId) {
            return { success: false, error: "This plan does not have PayPal configured" };
        }

        // Check if user already has an active subscription
        const { rows: activeRows } = await pgDbReadPool.query(`
            SELECT id FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND ("endsAt" IS NULL OR "endsAt" > NOW())
        `, [currentUser.id]);

        if (activeRows.length > 0) {
            return { success: false, error: "You already have an active subscription" };
        }

        // Get base URL from environment
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://diwadate.com';
        const returnUrl = `${baseUrl}/account/billing/paypal-return?planId=${planId}`;
        const cancelUrl = `${baseUrl}/account/billing?cancelled=true`;

        // Create PayPal subscription
        const paypalResult = await createPayPalSubscription(
            subscriptionPlan.paypalPlanId,
            returnUrl,
            cancelUrl
        );

        if (!paypalResult.success || !paypalResult.approvalUrl) {
            return {
                success: false,
                error: paypalResult.error || "Failed to create PayPal subscription"
            };
        }

        return {
            success: true,
            approvalUrl: paypalResult.approvalUrl,
            subscriptionId: paypalResult.subscriptionId
        };
    } catch (error) {
        console.error('PayPal subscription initiation error:', error);
        return { success: false, error: "Failed to initiate PayPal subscription. Please try again." };
    }
}

/**
 * Handles PayPal subscription enrollment after user returns from PayPal approval
 * @param subscriptionID PayPal subscription ID
 * @param planId Internal plan ID
 * @returns Success status and any error messages
 */
export async function handlePayPalSubscription(subscriptionID: string, planId: number) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Verify the PayPal subscription is valid
        const verifyResult = await verifyPayPalSubscription(subscriptionID);

        if (!verifyResult.success) {
            return {
                success: false,
                error: verifyResult.error || "Failed to verify PayPal subscription"
            };
        }

        // Check if the subscription plan exists
        const { rows: planRows } = await pgDbReadPool.query(`
            SELECT id, name, "listPrice", "listPriceUnit" 
            FROM "subscriptionPlans" 
            WHERE id = $1
        `, [planId]);

        if (planRows.length === 0) {
            return { success: false, error: "Subscription plan not found" };
        }

        const subscriptionPlan = planRows[0];

        // Check if user already has an active subscription
        const { rows: activeRows } = await pgDbReadPool.query(`
            SELECT id FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND ("endsAt" IS NULL OR "endsAt" > NOW())
        `, [currentUser.id]);

        if (activeRows.length > 0) {
            return { success: false, error: "You already have an active subscription" };
        }

        // Check if user has any existing subscription record (active or expired)
        const { rows: existingRows } = await pgDbReadPool.query(`
            SELECT id FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            ORDER BY "createdAt" DESC
            LIMIT 1
        `, [currentUser.id]);

        const startDate = moment().startOf('minute');

        // Calculate next payment date (1 month from now)
        const nextPaymentDate = moment(startDate)
            .add(1, 'month')
            .startOf('day')
            .hours(startDate.hours())
            .minutes(startDate.minutes());

        // Handle end of month edge cases
        if (startDate.date() !== nextPaymentDate.date()) {
            nextPaymentDate.endOf('month');
        }

        // Convert to Date objects for database storage
        const startDateObj = startDate.toDate();
        const nextPaymentDateObj = nextPaymentDate.toDate();

        let enrollmentId: number;

        if (existingRows.length > 0) {
            // Update existing enrollment record
            enrollmentId = existingRows[0].id;

            await pgDbWritePool.query(`
                UPDATE "subscriptionPlanEnrollments" 
                SET 
                    "subscriptionPlanId" = $1,
                    "endsAt" = NULL,
                    "startedAt" = $2,
                    "lastPaymentAt" = $3,
                    "nextPaymentAt" = $4,
                    "price" = $5,
                    "chargeInterval" = $6,
                    "priceUnit" = $7,
                    "updatedAt" = $8,
                    "lastEvalAt" = $9,
                    "paypalSubscriptionId" = $10
                WHERE id = $11
            `, [
                planId,
                startDateObj,
                startDateObj,
                nextPaymentDateObj,
                subscriptionPlan.listPrice || 0,
                'monthly',
                subscriptionPlan.listPriceUnit || 'USD',
                new Date(),
                new Date(),
                subscriptionID,
                enrollmentId
            ]);
        } else {
            // Create new enrollment record
            const { rows: insertedRows } = await pgDbWritePool.query(`
                INSERT INTO "subscriptionPlanEnrollments" (
                    "userId", "subscriptionPlanId", "startedAt", "lastPaymentAt", "nextPaymentAt",
                    "price", "chargeInterval", "priceUnit", "createdAt", "updatedAt", "lastEvalAt", "paypalSubscriptionId"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `, [
                currentUser.id,
                planId,
                startDateObj,
                startDateObj,
                nextPaymentDateObj,
                subscriptionPlan.listPrice || 0,
                'monthly',
                subscriptionPlan.listPriceUnit || 'USD',
                new Date(),
                new Date(),
                new Date(),
                subscriptionID
            ]);

            enrollmentId = insertedRows[0].id;
        }

        // Update user premium status
        await pgDbWritePool.query(`
            UPDATE "users" 
            SET "isPremium" = true, 
                "updatedAt" = NOW() 
            WHERE id = $1
        `, [currentUser.id]);

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('PayPal subscription enrollment error:', error);
        return { success: false, error: "Failed to process PayPal subscription. Please try again." };
    }
}


/**
 * Gets the current user's billing information
 * @returns The user's billing information or null if not found
 */
export async function getBillingInformation() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return null;
    }

    try {
        const billingInfo = await prismaRead.billingInformationEntries.findFirst({
            where: { userId: currentUser.id },
            select: {
                name: true,
                address1: true,
                address2: true,
                city: true,
                region: true,
                postalCode: true,
                country: true
            }
        });

        return billingInfo;
    } catch (error) {
        console.error('Get billing information error:', error);
        return null;
    }
}

/**
 * Gets all available subscription plans
 * @returns Array of subscription plans
 */
export async function getSubscriptionPlans() {
    try {
        const { rows } = await pgDbReadPool.query(`
            SELECT id, name, description, "listPrice", "listPriceUnit", "paypalPlanId", "createdAt", "updatedAt"
            FROM "subscriptionPlans" 
            ORDER BY "listPrice" ASC
        `);
        return rows;
    } catch (error) {
        console.error('Get subscription plans error:', error);
        return [];
    }
}

/**
 * Checks if the current user has complete billing information
 * @returns True if billing information is complete, false otherwise
 */
export async function isBillingInformationComplete() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return false;
    }

    try {
        const billingInfo = await prismaRead.billingInformationEntries.findFirst({
            where: { userId: currentUser.id }
        });

        if (!billingInfo) {
            return false;
        }

        // Check if all required fields are present (no payment method required anymore)
        return !!(
            billingInfo.name?.trim() &&
            billingInfo.address1?.trim() &&
            billingInfo.city?.trim() &&
            billingInfo.region?.trim() &&
            (await isPostalCodeRequired(billingInfo.country) ? billingInfo.postalCode?.trim() : true) &&
            billingInfo.country?.trim()
        );
    } catch (error) {
        console.error('Check billing information completeness error:', error);
        return false;
    }
}


/**
 * Cancels a user's subscription by setting the endsAt date to their next payment date
 * Also cancels the subscription on PayPal's end if it's a PayPal subscription
 * @returns Success status and any error messages
 */
export async function cancelSubscription() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Find the user's active subscription
        const { rows: enrollmentRows } = await pgDbReadPool.query(`
            SELECT id, "nextPaymentAt", "paypalSubscriptionId" FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND ("endsAt" IS NULL OR "endsAt" > NOW())
            ORDER BY "createdAt" DESC
            LIMIT 1
        `, [currentUser.id]);

        if (enrollmentRows.length === 0) {
            return { success: false, error: "No active subscription found" };
        }

        const enrollment = enrollmentRows[0];

        // If there's a PayPal subscription ID, suspend it on PayPal's end first
        if (enrollment.paypalSubscriptionId) {
            console.log(`Suspending PayPal subscription: ${enrollment.paypalSubscriptionId}`);
            const paypalResult = await suspendPayPalSubscription(
                enrollment.paypalSubscriptionId,
                'User requested suspension'
            );

            if (!paypalResult.success) {
                console.error('Failed to suspend PayPal subscription:', paypalResult.error);
                // Return error to show alert to user
                return {
                    success: false,
                    error: paypalResult.error || "Failed to suspend PayPal subscription. Please contact support."
                };
            }

            console.log('Successfully suspended PayPal subscription');
        }

        // Set endsAt to the nextPaymentAt date
        await pgDbWritePool.query(`
            UPDATE "subscriptionPlanEnrollments" 
            SET "endsAt" = $1, "updatedAt" = NOW() 
            WHERE id = $2
        `, [enrollment.nextPaymentAt, enrollment.id]);

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('Subscription cancellation error:', error);
        return { success: false, error: "Failed to cancel subscription. Please try again." };
    }
}

/**
 * Reactivates a user's subscription by removing the endsAt date
 * Also reactivates the subscription on PayPal's end if it's a PayPal subscription
 * @returns Success status and any error messages
 */
export async function reactivateSubscription() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {

        // Find the user's subscription that's scheduled to end
        const { rows: enrollmentRows } = await pgDbReadPool.query(`
            SELECT id, "paypalSubscriptionId" FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND "endsAt" IS NOT NULL 
            AND "endsAt" > NOW()
            ORDER BY "createdAt" DESC
            LIMIT 1
        `, [currentUser.id]);

        if (enrollmentRows.length === 0) {
            return { success: false, error: "No subscription scheduled for cancellation found" };
        }

        const enrollment = enrollmentRows[0];

        // If there's a PayPal subscription ID, activate it on PayPal's end first
        if (enrollment.paypalSubscriptionId) {
            console.log(`Activating PayPal subscription: ${enrollment.paypalSubscriptionId}`);
            const paypalResult = await activatePayPalSubscription(
                enrollment.paypalSubscriptionId,
                'User requested reactivation'
            );

            if (!paypalResult.success) {
                console.error('Failed to activate PayPal subscription:', paypalResult.error);
                // Return error to show alert to user
                return {
                    success: false,
                    error: paypalResult.error || "Failed to activate PayPal subscription. Please contact support."
                };
            }

            console.log('Successfully activated PayPal subscription');
        }

        // Remove the endsAt date to reactivate
        await pgDbWritePool.query(`
            UPDATE "subscriptionPlanEnrollments" 
            SET "endsAt" = NULL, "updatedAt" = NOW() 
            WHERE id = $1
        `, [enrollment.id]);

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('Subscription reactivation error:', error);
        return { success: false, error: "Failed to reactivate subscription. Please try again." };
    }
}

/**
 * Removes a user's subscription enrollment completely
 * This deletes the enrollment record and cancels on PayPal if applicable
 * Used when there's a payment dispute and user wants to start fresh
 * @returns Success status and any error messages
 */
export async function removeSubscription() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Find the user's active subscription
        const { rows: enrollmentRows } = await pgDbReadPool.query(`
            SELECT id, "paypalSubscriptionId" FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND ("endsAt" IS NULL OR "endsAt" > NOW())
            ORDER BY "createdAt" DESC
            LIMIT 1
        `, [currentUser.id]);

        if (enrollmentRows.length === 0) {
            return { success: false, error: "No active subscription found" };
        }

        const enrollment = enrollmentRows[0];

        // If there's a PayPal subscription ID, cancel it on PayPal's end first
        if (enrollment.paypalSubscriptionId) {
            console.log(`Canceling PayPal subscription: ${enrollment.paypalSubscriptionId}`);
            const paypalResult = await cancelPayPalSubscription(
                enrollment.paypalSubscriptionId,
                'User requested removal due to payment dispute'
            );

            if (!paypalResult.success) {
                console.error('Failed to cancel PayPal subscription:', paypalResult.error);
                // Continue with local deletion even if PayPal cancellation fails
                // Log the error but don't block the user from removing the enrollment
                console.error('Warning: PayPal cancellation failed but proceeding with local deletion');
            } else {
                console.log('Successfully canceled PayPal subscription');
            }
        }

        // Delete the subscription enrollment
        await pgDbWritePool.query(`
            DELETE FROM "subscriptionPlanEnrollments" 
            WHERE id = $1
        `, [enrollment.id]);

        // Set isPremium to false
        await pgDbWritePool.query(`
            UPDATE "users" 
            SET "isPremium" = false, "updatedAt" = NOW() 
            WHERE id = $1
        `, [currentUser.id]);

        console.log(`Successfully removed subscription enrollment for user ${currentUser.id}`);

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('Subscription removal error:', error);
        return { success: false, error: "Failed to remove subscription. Please try again." };
    }
}

/**
 * Gets the current user's subscription details including cancellation status
 * @returns Subscription details or null if not found
 */
export async function getCurrentSubscriptionDetails() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return null;
    }

    try {
        const { rows } = await pgDbReadPool.query(`
            SELECT 
                spe.id,
                spe."endsAt",
                spe."nextPaymentAt",
                spe."startedAt",
                spe."price",
                spe."priceUnit",
                spe."paypalSubscriptionId",
                spe."paymentDisputeMessage",
                spe."paymentDisputeDate",
                sp.name as "planName"
            FROM "subscriptionPlanEnrollments" spe
            JOIN "subscriptionPlans" sp ON sp.id = spe."subscriptionPlanId"
            WHERE spe."userId" = $1 
            AND ("endsAt" IS NULL OR "endsAt" > NOW())
            ORDER BY spe."createdAt" DESC
            LIMIT 1
        `, [currentUser.id]);

        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Get subscription details error:', error);
        return null;
    }
}

/**
 * Gets the current user's payment history from the paymentTransactions table
 * @returns Array of payment transactions ordered by date (newest first)
 */
export async function getPaymentHistory() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return [];
    }

    try {
        const { rows } = await pgDbReadPool.query(`
            SELECT 
                id,
                "transId",
                amount,
                description,
                "accountNumber",
                "createdAt",
                "paymentMethod",
                status
            FROM "paymentTransactions"
            WHERE "userId" = $1 
            AND "createdAt" >= NOW() - INTERVAL '1 year'
            ORDER BY "createdAt" DESC
        `, [currentUser.id]);

        return rows;
    } catch (error) {
        console.error('Get payment history error:', error);
        return [];
    }
}
