'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import pgDbPool from "@/lib/postgres";
import { revalidatePath } from "next/cache";

export interface BillingInformation {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
}

export interface PaymentInformation {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
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
        if (!billingInfo.postalCode?.trim()) {
            return { success: false, error: "Postal code is required" };
        }
        if (!billingInfo.country?.trim()) {
            return { success: false, error: "Country is required" };
        }

        // Check if user already has billing information
        const existingBilling = await prisma.billingInformationEntries.findFirst({
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
            await prisma.billingInformationEntries.update({
                where: { id: existingBilling.id },
                data: billingData
            });
        } else {
            // Create new billing information
            await prisma.billingInformationEntries.create({
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
 * Updates the user's payment method (stubbed for now)
 * @param paymentInfo The payment information to process
 * @returns Success status and any error messages
 */
export async function updatePaymentMethod(paymentInfo: PaymentInformation) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Validate required fields
        if (!paymentInfo.cardNumber?.trim()) {
            return { success: false, error: "Card number is required" };
        }
        if (!paymentInfo.expiryMonth?.trim()) {
            return { success: false, error: "Expiry month is required" };
        }
        if (!paymentInfo.expiryYear?.trim()) {
            return { success: false, error: "Expiry year is required" };
        }
        if (!paymentInfo.cvv?.trim()) {
            return { success: false, error: "CVV is required" };
        }
        if (!paymentInfo.cardholderName?.trim()) {
            return { success: false, error: "Cardholder name is required" };
        }

        // Validate card number format (basic Luhn algorithm)
        const cardNumber = paymentInfo.cardNumber.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(cardNumber)) {
            return { success: false, error: "Invalid card number format" };
        }

        // Validate expiry date
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const expiryYear = parseInt(paymentInfo.expiryYear);
        const expiryMonth = parseInt(paymentInfo.expiryMonth);

        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
            return { success: false, error: "Card has expired" };
        }

        // Validate CVV
        if (!/^\d{3,4}$/.test(paymentInfo.cvv)) {
            return { success: false, error: "Invalid CVV format" };
        }

        // Determine card type
        let cardType = 'Unknown';
        if (/^4/.test(cardNumber)) {
            cardType = 'Visa';
        } else if (/^5[1-5]/.test(cardNumber)) {
            cardType = 'MasterCard';
        } else if (/^3[47]/.test(cardNumber)) {
            cardType = 'American Express';
        } else if (/^6/.test(cardNumber)) {
            cardType = 'Discover';
        }

        // Get last 4 digits
        const last4 = cardNumber.slice(-4);

        // Check if user already has billing information
        const existingBilling = await prisma.billingInformationEntries.findFirst({
            where: { userId: currentUser.id }
        });

        const paymentData = {
            paymentMethod: cardType,
            cclast4: last4,
            updatedAt: new Date()
        };

        if (existingBilling) {
            // Update existing billing information with payment details
            await prisma.billingInformationEntries.update({
                where: { id: existingBilling.id },
                data: paymentData
            });
        } else {
            // Create new billing information with payment details
            await prisma.billingInformationEntries.create({
                data: {
                    userId: currentUser.id,
                    name: '',
                    address1: '',
                    city: '',
                    region: '',
                    postalCode: '',
                    country: '',
                    ...paymentData,
                    createdAt: new Date()
                }
            });
        }

        // TODO: In the future, integrate with Authorize.net here
        // For now, we just simulate successful payment method storage

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('Payment method update error:', error);
        return { success: false, error: "Failed to update payment method. Please try again." };
    }
}

/**
 * Deletes the current user's payment method information
 * @returns Success status and any error messages
 */
export async function deletePaymentMethod() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Find existing billing information
        const existingBilling = await prisma.billingInformationEntries.findFirst({
            where: { userId: currentUser.id }
        });

        if (!existingBilling) {
            return { success: false, error: "No billing information found" };
        }

        // Clear payment method fields
        await prisma.billingInformationEntries.update({
            where: { id: existingBilling.id },
            data: {
                paymentMethod: '',
                cclast4: '',
                updatedAt: new Date()
            }
        });

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('Delete payment method error:', error);
        return { success: false, error: "Failed to delete payment method. Please try again." };
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
        const billingInfo = await prisma.billingInformationEntries.findFirst({
            where: { userId: currentUser.id },
            select: {
                name: true,
                address1: true,
                address2: true,
                city: true,
                region: true,
                postalCode: true,
                country: true,
                paymentMethod: true,
                cclast4: true
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
        const { rows } = await pgDbPool.query(`
            SELECT id, name, description, "listPrice", "listPriceUnit", "createdAt", "updatedAt"
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
        const billingInfo = await prisma.billingInformationEntries.findFirst({
            where: { userId: currentUser.id }
        });

        if (!billingInfo) {
            return false;
        }

        // Check if all required fields are present
        return !!(
            billingInfo.name?.trim() &&
            billingInfo.address1?.trim() &&
            billingInfo.city?.trim() &&
            billingInfo.region?.trim() &&
            billingInfo.postalCode?.trim() &&
            billingInfo.country?.trim() &&
            billingInfo.paymentMethod?.trim() &&
            billingInfo.cclast4?.trim()
        );
    } catch (error) {
        console.error('Check billing information completeness error:', error);
        return false;
    }
}

/**
 * Enrolls a user in a subscription plan
 * @param subscriptionPlanId The ID of the subscription plan to enroll in
 * @returns Success status and any error messages
 */
export async function enrollInSubscriptionPlan(subscriptionPlanId: number) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Check if billing information is complete
        const billingComplete = await isBillingInformationComplete();
        if (!billingComplete) {
            return {
                success: false,
                error: "Please complete your billing information and payment method before enrolling in a premium plan."
            };
        }

        // Check if the subscription plan exists
        const { rows: planRows } = await pgDbPool.query(`
            SELECT id, name, "listPrice", "listPriceUnit" 
            FROM "subscriptionPlans" 
            WHERE id = $1
        `, [subscriptionPlanId]);

        if (planRows.length === 0) {
            return { success: false, error: "Subscription plan not found" };
        }

        const subscriptionPlan = planRows[0];

        // Check if user already has an active subscription
        const { rows: activeRows } = await pgDbPool.query(`
            SELECT id FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND ("endsAt" IS NULL OR "endsAt" > NOW())
        `, [currentUser.id]);

        if (activeRows.length > 0) {
            return { success: false, error: "You already have an active subscription" };
        }

        // Check if user has any existing subscription record (active or expired)
        const { rows: existingRows } = await pgDbPool.query(`
            SELECT id FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            ORDER BY "createdAt" DESC
            LIMIT 1
        `, [currentUser.id]);

        const startDate = new Date();
        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

        if (existingRows.length > 0) {
            // Update existing enrollment record
            const existingEnrollmentId = existingRows[0].id;

            await pgDbPool.query(`
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
                    "updatedAt" = $8
                WHERE id = $9
            `, [
                subscriptionPlanId,
                startDate,
                startDate,
                nextPaymentDate,
                subscriptionPlan.listPrice || 0,
                'monthly',
                subscriptionPlan.listPriceUnit || 'USD',
                new Date(),
                existingEnrollmentId
            ]);
        } else {
            // Create new enrollment record
            await pgDbPool.query(`
                INSERT INTO "subscriptionPlanEnrollments" (
                    "userId", "subscriptionPlanId", "startedAt", "lastPaymentAt", "nextPaymentAt",
                    "price", "chargeInterval", "priceUnit", "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                currentUser.id,
                subscriptionPlanId,
                startDate,
                startDate,
                nextPaymentDate,
                subscriptionPlan.listPrice || 0,
                'monthly',
                subscriptionPlan.listPriceUnit || 'USD',
                new Date(),
                new Date()
            ]);
        }

        // TODO: In the future, integrate with payment processor here
        // For now, we just simulate successful enrollment

        revalidatePath('/account/billing');
        return { success: true };
    } catch (error) {
        console.error('Subscription enrollment error:', error);
        return { success: false, error: "Failed to enroll in subscription plan. Please try again." };
    }
}

/**
 * Cancels a user's subscription by setting the endsAt date to their next payment date
 * @returns Success status and any error messages
 */
export async function cancelSubscription() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Find the user's active subscription
        const { rows: enrollmentRows } = await pgDbPool.query(`
            SELECT id, "nextPaymentAt" FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND ("endsAt" IS NULL OR "endsAt" > NOW())
            ORDER BY "createdAt" DESC
            LIMIT 1
        `, [currentUser.id]);

        if (enrollmentRows.length === 0) {
            return { success: false, error: "No active subscription found" };
        }

        const enrollment = enrollmentRows[0];

        // Set endsAt to the nextPaymentAt date
        await pgDbPool.query(`
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
 * @returns Success status and any error messages
 */
export async function reactivateSubscription() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Check if billing information is complete
        const billingComplete = await isBillingInformationComplete();
        if (!billingComplete) {
            return {
                success: false,
                error: "Please ensure your billing information and payment method are up to date before reactivating your subscription."
            };
        }

        // Find the user's subscription that's scheduled to end
        const { rows: enrollmentRows } = await pgDbPool.query(`
            SELECT id FROM "subscriptionPlanEnrollments" 
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

        // Remove the endsAt date to reactivate
        await pgDbPool.query(`
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
 * Gets the current user's subscription details including cancellation status
 * @returns Subscription details or null if not found
 */
export async function getCurrentSubscriptionDetails() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return null;
    }

    try {
        const { rows } = await pgDbPool.query(`
            SELECT 
                spe.id,
                spe."endsAt",
                spe."nextPaymentAt",
                spe."startedAt",
                spe."price",
                spe."priceUnit",
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
