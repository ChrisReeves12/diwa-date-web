/**
 * Billing helpers for Authorize.net payment processing
 *
 * This module provides functions to interact with the Authorize.net API
 * for customer and payment management.
 */

import { logError } from './logging.helpers';
import { prismaRead, prismaWrite } from '@/lib/prisma';

// Types for better type safety
export interface AuthorizeNetCredentials {
    endpoint: string;
    loginId: string;
    transactionKey: string;
    signatureKey: string;
}

export interface CustomerProfile {
    merchantCustomerId?: string;
    description?: string;
    email?: string;
    profileType?: 'regular' | 'guest';
}

export interface BillingAddress {
    firstName?: string;
    lastName?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phoneNumber?: string;
    faxNumber?: string;
}

export interface CustomerPaymentProfile {
    customerType?: 'individual' | 'business';
    billTo?: BillingAddress;
    payment?: {
        creditCard?: {
            cardNumber: string;
            expirationDate: string; // YYYY-MM format
            cardCode?: string;
        };
        bankAccount?: {
            accountType: 'checking' | 'savings' | 'businessChecking';
            routingNumber: string;
            accountNumber: string;
            nameOnAccount: string;
        };
    };
}

export interface CreateCustomerProfileRequest {
    profile: CustomerProfile;
    paymentProfiles?: CustomerPaymentProfile[];
    validationMode?: 'none' | 'testMode' | 'liveMode';
}

export interface AuthorizeNetResponse {
    messages: {
        resultCode: 'Ok' | 'Error';
        message: Array<{
            code: string;
            text: string;
        }>;
    };
    customerProfileId?: string;
    customerPaymentProfileIdList?: string[];
    customerShippingAddressIdList?: string[];
    validationDirectResponseList?: string[];
}

export interface CreateTransactionRequest {
    profile: {
        customerProfileId: string;
        customerPaymentProfileId?: string;
        customerShippingAddressId?: string;
    };
}

export interface CreateTransactionResponse extends AuthorizeNetResponse {
    transactionResponse?: {
        responseCode: string;
        authCode?: string;
        avsResultCode?: string;
        cvvResultCode?: string;
        cavvResultCode?: string;
        transId: string;
        refTransID?: string;
        transHash: string;
        errors?: Array<{ errorCode: string, errorText: string }>;
        testRequest?: string;
        accountNumber?: string;
        accountType?: string;
        messages?: Array<{
            code: string;
            description: string;
        }>;
        transHashSha2?: string;
        SupplementalDataQualificationIndicator?: number;
        networkTransId?: string;
    };
}

export interface ChargeCustomerProfileRequest {
    transactionType: 'authCaptureTransaction' | 'authOnlyTransaction';
    amount: string;
    profile: {
        customerProfileId: string;
        paymentProfile?: {
            paymentProfileId: string;
        };
        shippingProfileId?: string;
    };
    order?: {
        invoiceNumber?: string;
        description?: string;
    };
    customer?: {
        id?: string;
        email?: string;
    };
}

export interface GetCustomerProfileResponse extends AuthorizeNetResponse {
    profile?: {
        merchantCustomerId?: string;
        description?: string;
        email?: string;
        customerProfileId: string;
        paymentProfiles?: Array<{
            customerPaymentProfileId: string;
            customerType?: string;
            billTo?: any;
            payment?: any;
        }>;
        shipToList?: Array<{
            customerAddressId: string;
            firstName?: string;
            lastName?: string;
            address?: string;
            city?: string;
            state?: string;
            zip?: string;
            country?: string;
        }>;
    };
}

export interface GetCustomerPaymentProfileRequest {
    customerProfileId: string;
    customerPaymentProfileId: string;
    includeIssuerInfo?: boolean;
}

export interface GetCustomerPaymentProfileResponse extends AuthorizeNetResponse {
    paymentProfile?: {
        customerPaymentProfileId: string;
        customerType?: string;
        billTo?: {
            firstName?: string;
            lastName?: string;
            company?: string;
            address?: string;
            city?: string;
            state?: string;
            zip?: string;
            country?: string;
            phoneNumber?: string;
            faxNumber?: string;
        };
        payment?: {
            creditCard?: {
                cardNumber: string;
                expirationDate: string;
                cardType?: string;
                issuerNumber?: string;
                isPaymentToken?: boolean;
            };
            bankAccount?: {
                accountType: string;
                routingNumber: string;
                accountNumber: string;
                nameOnAccount: string;
                echeckType?: string;
                bankName?: string;
                checkNumber?: string;
            };
        };
        subscriptionIds?: string[];
        originalNetworkTransId?: string;
        originalAuthAmount?: string;
        issuerInfo?: {
            issuerCountry?: string;
            issuerCountryCode?: string;
            issuerName?: string;
            issuerWebsite?: string;
        };
    };
}

/**
 * Get Authorize.net credentials from environment variables
 */
function getAuthorizeNetCredentials(): AuthorizeNetCredentials {
    const endpoint = process.env.AUTHORIZE_NET_ENDPOINT;
    const loginId = process.env.AUTHORIZE_NET_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TX_KEY;
    const signatureKey = process.env.AUTHORIZE_NET_SIGNATURE_KEY;

    if (!endpoint || !loginId || !transactionKey || !signatureKey) {
        throw new Error('Missing required Authorize.net environment variables');
    }

    return {
        endpoint,
        loginId,
        transactionKey,
        signatureKey
    };
}

/**
 * Create a customer profile in Authorize.net
 *
 * @param customerData - Customer profile data
 * @returns Promise with the API response
 */
export async function createCustomerProfile(
    customerData: CreateCustomerProfileRequest
): Promise<AuthorizeNetResponse> {
    const credentials = getAuthorizeNetCredentials();

    // Build the profile object
    const profile: any = {
        merchantCustomerId: customerData.profile.merchantCustomerId,
        description: customerData.profile.description,
        email: customerData.profile.email
    };

    // Add payment profiles if provided
    if (customerData.paymentProfiles && customerData.paymentProfiles.length > 0) {
        profile.paymentProfiles = customerData.paymentProfiles.map(profileData => {
            const paymentProfile: any = {
                customerType: profileData.customerType || 'individual'
            };

            // Add billing address if provided
            if (profileData.billTo) {
                const billTo: any = {};

                if (profileData.billTo.firstName) billTo.firstName = profileData.billTo.firstName;
                if (profileData.billTo.lastName) billTo.lastName = profileData.billTo.lastName;
                if (profileData.billTo.company) billTo.company = profileData.billTo.company;
                if (profileData.billTo.address) billTo.address = profileData.billTo.address;
                if (profileData.billTo.city) billTo.city = profileData.billTo.city;
                if (profileData.billTo.state) billTo.state = profileData.billTo.state;
                if (profileData.billTo.zip) billTo.zip = profileData.billTo.zip;
                if (profileData.billTo.country) billTo.country = profileData.billTo.country;
                if (profileData.billTo.phoneNumber) billTo.phoneNumber = profileData.billTo.phoneNumber;
                if (profileData.billTo.faxNumber) billTo.faxNumber = profileData.billTo.faxNumber;

                paymentProfile.billTo = billTo;
            }

            // Add payment information
            if (profileData.payment) {
                paymentProfile.payment = profileData.payment;
            }

            return paymentProfile;
        });
    }

    const requestPayload = {
        createCustomerProfileRequest: {
            merchantAuthentication: {
                name: credentials.loginId,
                transactionKey: credentials.transactionKey
            },
            profile: profile,
            validationMode: customerData.validationMode || 'none'
        }
    };

    try {
        const response = await fetch(credentials.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData: AuthorizeNetResponse = await response.json();

        return responseData;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error creating customer profile: ${errorMessage}`)
        );
        throw error;
    }
}

/**
 * Helper function to create a customer profile with payment information
 *
 * @param customerData - Customer profile data including payment info
 * @returns Promise with the API response
 */
export async function createCustomerProfileWithPayment(
    customerData: {
        email: string;
        merchantCustomerId?: string;
        description?: string;
        creditCard?: {
            cardNumber: string;
            expirationDate: string;
            cardCode?: string;
        };
        billingAddress?: BillingAddress;
        validationMode?: 'none' | 'testMode' | 'liveMode';
    }
): Promise<AuthorizeNetResponse> {
    const paymentProfiles: CustomerPaymentProfile[] = [];

    if (customerData.creditCard) {
        paymentProfiles.push({
            customerType: 'individual',
            billTo: customerData.billingAddress,
            payment: {
                creditCard: customerData.creditCard
            }
        });
    }

    return createCustomerProfile({
        profile: {
            merchantCustomerId: customerData.merchantCustomerId || `customer_${Date.now()}`,
            description: customerData.description || 'Customer profile',
            email: customerData.email
        },
        paymentProfiles: paymentProfiles.length > 0 ? paymentProfiles : undefined,
        validationMode: customerData.validationMode || 'none'
    });
}

/**
 * Delete a customer profile from Authorize.net
 *
 * @param customerProfileId - The customer profile ID to delete
 * @returns Promise with the API response
 */
export async function deleteCustomerProfile(customerProfileId: string): Promise<AuthorizeNetResponse> {
    const credentials = getAuthorizeNetCredentials();

    const requestPayload = {
        deleteCustomerProfileRequest: {
            merchantAuthentication: {
                name: credentials.loginId,
                transactionKey: credentials.transactionKey
            },
            customerProfileId: customerProfileId
        }
    };

    try {
        const response = await fetch(credentials.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData: AuthorizeNetResponse = await response.json();

        return responseData;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error deleting customer profile: ${errorMessage}`)
        );
        throw error;
    }
}

/**
 * Charge a customer profile using stored payment information
 *
 * @param requestData - Transaction request data with profile information
 * @returns Promise with the API response
 */
export async function chargeCustomerProfile(
    requestData: ChargeCustomerProfileRequest
): Promise<CreateTransactionResponse> {
    const credentials = getAuthorizeNetCredentials();

    const requestPayload = {
        createTransactionRequest: {
            merchantAuthentication: {
                name: credentials.loginId,
                transactionKey: credentials.transactionKey
            },
            transactionRequest: {
                transactionType: requestData.transactionType,
                amount: requestData.amount,
                profile: requestData.profile,
                order: requestData.order,
                customer: requestData.customer
            }
        }
    };

    try {
        const response = await fetch(credentials.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error charging customer profile: ${errorMessage}`)
        );
        throw error;
    }
}

/**
 * Create a payment transaction record in the database
 *
 * @param transactionData - Payment transaction data
 * @returns Promise with the created transaction record
 */
export async function createPaymentTransaction(transactionData: {
    userId: number;
    amount: number;
    transId: string;
    transHash: string;
    accountNumber?: string;
    description?: string;
    status?: string;
    paymentMethod?: string;
    errors?: Array<{ errorCode: string, errorText: string }>;
    transactionResponse: any
}): Promise<any> {
    try {
        return await prismaWrite.paymentTransactions.create({
            data: {
                userId: transactionData.userId,
                amount: transactionData.amount,
                transId: transactionData.transId,
                accountNumber: transactionData.accountNumber,
                description: transactionData.description,
                status: transactionData.status || 'approved',
                paymentMethod: transactionData.paymentMethod,
                errors: transactionData.errors,
                apiResponse: transactionData.transactionResponse,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error creating payment transaction: ${errorMessage}`)
        );
        throw error;
    }
}

/**
 * Get customer profile details from Authorize.net
 *
 * @param customerProfileId - The customer profile ID
 * @returns Promise with the customer profile details
 */
export async function getCustomerProfile(customerProfileId: string): Promise<GetCustomerProfileResponse> {
    const credentials = getAuthorizeNetCredentials();

    const requestPayload = {
        getCustomerProfileRequest: {
            merchantAuthentication: {
                name: credentials.loginId,
                transactionKey: credentials.transactionKey
            },
            customerProfileId: customerProfileId
        }
    };

    try {
        const response = await fetch(credentials.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error getting customer profile: ${errorMessage}`)
        );
        throw error;
    }
}

/**
 * Get a specific customer payment profile from Authorize.net
 *
 * @param requestData - Request data for getting a payment profile
 * @returns Promise with the payment profile details
 */
export async function getCustomerPaymentProfile(
    requestData: GetCustomerPaymentProfileRequest
): Promise<GetCustomerPaymentProfileResponse> {
    const credentials = getAuthorizeNetCredentials();

    const requestPayload = {
        getCustomerPaymentProfileRequest: {
            merchantAuthentication: {
                name: credentials.loginId,
                transactionKey: credentials.transactionKey
            },
            customerProfileId: requestData.customerProfileId,
            customerPaymentProfileId: requestData.customerPaymentProfileId,
            includeIssuerInfo: requestData.includeIssuerInfo || false
        }
    };

    try {
        const response = await fetch(credentials.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData: GetCustomerPaymentProfileResponse = await response.json();

        return responseData;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error getting customer payment profile: ${errorMessage}`)
        );
        throw error;
    }
}

/**
 * Charge a customer by billing information entry ID
 *
 * @param billingInformationEntryId - ID of the billing information entry
 * @param amount - Amount to charge
 * @param description - Optional description for the transaction
 * @returns Promise with the transaction response and database record
 */
export async function chargeCustomerByBillingEntry(
    billingInformationEntryId: number,
    amount: number,
    description?: string
): Promise<{
    authorizeNetResponse: CreateTransactionResponse;
    paymentTransaction: any;
}> {
    try {
        // Get the billing information entry with customer profile ID
        const billingEntry = await prismaRead.billingInformationEntries.findUnique({
            where: {
                id: billingInformationEntryId
            },
            include: {
                users: true
            }
        });

        if (!billingEntry) {
            throw new Error(`Billing information entry not found with ID: ${billingInformationEntryId}`);
        }

        if (!(billingEntry as any).customerProfileId) {
            throw new Error(`No customer profile ID found for billing entry: ${billingInformationEntryId}`);
        }

        const customerProfileId = (billingEntry as any).customerProfileId;
        const customerPaymentProfileId = (billingEntry as any).customerPaymentProfileId;

        let finalPaymentProfileId = customerPaymentProfileId;

        // Check if we have the payment profile ID stored
        if (!customerPaymentProfileId) {
            // Fallback: Get customer profile details to find payment profiles
            const profileResponse = await getCustomerProfile(customerProfileId);

            if (profileResponse.messages.resultCode !== 'Ok') {
                throw new Error(`Failed to get customer profile: ${profileResponse.messages.message[0]?.text || 'Unknown error'}`);
            }

            if (!profileResponse.profile?.paymentProfiles || profileResponse.profile.paymentProfiles.length === 0) {
                throw new Error(`No payment profiles found for customer profile: ${customerProfileId}`);
            }

            // Use the first payment profile available and update the database for future use
            const paymentProfile = profileResponse.profile.paymentProfiles[0];
            finalPaymentProfileId = paymentProfile.customerPaymentProfileId;

            // Update the billing entry with the payment profile ID for future use
            await prismaWrite.billingInformationEntries.update({
                where: {
                    id: billingInformationEntryId
                },
                data: {
                    customerPaymentProfileId: paymentProfile.customerPaymentProfileId,
                    updatedAt: new Date()
                } as any
            });
        }

        // Charge the customer profile with the payment profile ID
        const chargeRequest: ChargeCustomerProfileRequest = {
            transactionType: 'authCaptureTransaction',
            amount: amount.toString(),
            profile: {
                customerProfileId: customerProfileId,
                paymentProfile: {
                    paymentProfileId: finalPaymentProfileId
                }
            },
            order: {
                invoiceNumber: `INV-${Date.now()}`,
                description: description || 'Service charge'
            },
            customer: {
                id: billingEntry.userId.toString(),
                email: billingEntry.users?.email || undefined
            }
        };

        const authorizeNetResponse = await chargeCustomerProfile(chargeRequest);

        // Check if the transaction was successful
        if (authorizeNetResponse.messages.resultCode !== 'Ok') {
            throw new Error(`Authorize.net API error: ${authorizeNetResponse.messages.message[0]?.text || 'Unknown error'}`);
        }

        if (!authorizeNetResponse.transactionResponse) {
            throw new Error('No transaction response from Authorize.net');
        }

        // Map response code to status
        const responseCode = authorizeNetResponse.transactionResponse.responseCode;
        let status: string;

        switch (responseCode) {
            case '1':
                status = 'approved';
                break;
            case '2':
                status = 'declined';
                break;
            case '3':
                status = 'error';
                break;
            case '4':
                status = 'held_for_review';
                break;
            default:
                status = 'unknown';
        }

        // Get the payment method (card type)
        let paymentMethod = billingEntry.paymentMethod;

        if (!paymentMethod || paymentMethod === '' || paymentMethod === 'Unknown') {
            paymentMethod = authorizeNetResponse.transactionResponse.accountType || billingEntry.paymentMethod || 'Credit/Debit Card';
        }

        // Always create payment transaction record, regardless of success or failure
        const paymentTransaction = await createPaymentTransaction({
            userId: billingEntry.userId,
            amount,
            transId: authorizeNetResponse.transactionResponse.transId,
            transHash: authorizeNetResponse.transactionResponse.transHash,
            accountNumber: authorizeNetResponse.transactionResponse.accountNumber,
            description,
            status: status,
            paymentMethod: paymentMethod,
            errors: authorizeNetResponse.transactionResponse.errors,
            transactionResponse: authorizeNetResponse.transactionResponse
        });

        return {
            authorizeNetResponse,
            paymentTransaction
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error charging customer by billing entry: ${errorMessage}`)
        );
        throw error;
    }
}

/**
 * Generate HTML receipt for successful payment
 *
 * @param params - Receipt parameters
 * @returns HTML receipt string
 */
export function generateReceiptHtml(params: {
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

/**
 * Generate HTML email for payment under review notifications
 *
 * @param params - Email parameters
 * @returns HTML email string
 */
export function generatePaymentReviewEmail(params: {
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
                    <div class="message-section">
                        <h2>Payment Under Review</h2>
                        <p>Hello,</p>
                        <p>Thank you for enrolling in your <strong>${planName} Membership</strong>! Your payment made on <strong>${reviewDate}</strong> is currently <strong>under review</strong> by our payment processor.</p>
                        <p>Your <strong>${planName} Membership</strong> is now active while we review your payment. This review process typically takes 1-3 business days.</p>
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
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/account/billing" class="cta-button">View Billing Information</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Questions?</strong> Our support team is here to help.</p>
                    <p>Contact us at support@diwadate.com or visit our help center.</p>
                    <p>Thank you for your patience and for being part of the Diwa Date community!</p>
                </div>
            </div>
        </body>
        </html>`;
}

/**
 * Generate HTML email for payment failure notifications
 *
 * @param params - Email parameters
 * @returns HTML email string
 */
export function generateBillingFailureEmail(params: {
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
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/account/billing" class="cta-button">Update Payment Method</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Need help?</strong> Our support team is here to assist you.</p>
                    <p>Contact us at support@diwadate.com or visit our help center.</p>
                    <p>Thank you for being part of the Diwa Date community, where you deserve to be loved!</p>
                </div>
            </div>
        </body>
        </html>`;
}

/**
 * Fetch regions (states) for a given country using its ISO2 code
 *
 * @param country - The ISO2 country code (e.g., "US", "CA", "GB")
 * @returns states
 */
export async function fetchRegionsForCountry(country: string) {
    try {
        const countryRecord = await prismaRead.countries.findUnique({
            where: {
                iso2: country
            }
        });

        if (!countryRecord) {
            return [];
        }

        if (!countryRecord.hasStates) {
            return [];
        }

        return await prismaRead.states.findMany({
            where: {
                countryId: countryRecord.id
            }
        });
    } catch (error) {
        logError(new Error(`Error fetching regions for country ${country}: ${error}`));
        return [];
    }
}

/**
 * Find payment transaction by ID
 * @param transactionId
 * @param userId
 * @returns
 */
export async function getPaymentTransaction(transactionId: string, userId: number) {
   try {
        return await prismaRead.paymentTransactions.findFirst({
            where: {
                transId: transactionId,
                userId
            }
        });
   } catch (error) {
        logError(new Error(`Error getting payment transaction ${transactionId}: ${error}`));
        return null;
   }
}
