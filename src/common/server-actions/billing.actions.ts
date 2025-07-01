'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
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
