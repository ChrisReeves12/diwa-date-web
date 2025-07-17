/**
 * Billing helpers for Authorize.net payment processing
 * 
 * This module provides functions to interact with the Authorize.net API
 * for customer and payment management.
 */

import { log, logError } from './logging.helpers';
import { prisma } from '../lib/prisma';

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
 * Helper function to create a basic customer profile with minimal data
 * 
 * @param email - Customer email address
 * @param merchantCustomerId - Optional merchant-assigned customer ID
 * @param description - Optional description
 * @returns Promise with the API response
 */
export async function createBasicCustomerProfile(
    email: string,
    merchantCustomerId?: string,
    description?: string
): Promise<AuthorizeNetResponse> {
    return createCustomerProfile({
        profile: {
            merchantCustomerId: merchantCustomerId || `customer_${Date.now()}`,
            description: description || 'Customer profile',
            email: email
        },
        validationMode: 'none'
    });
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
 * Create a customer profile with payment information and store the profile IDs in the database
 * 
 * @param customerData - Customer profile data including payment info
 * @param billingInformationEntryId - ID of the billing information entry to update
 * @returns Promise with the API response and updated billing entry
 */
export async function createCustomerProfileWithPaymentAndStore(
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
    },
    billingInformationEntryId: number
): Promise<{
    authorizeNetResponse: AuthorizeNetResponse;
    updatedBillingEntry: any;
}> {
    try {
        // Create the customer profile
        const authorizeNetResponse = await createCustomerProfileWithPayment(customerData);

        if (authorizeNetResponse.messages.resultCode !== 'Ok') {
            throw new Error(`Failed to create customer profile: ${authorizeNetResponse.messages.message[0]?.text || 'Unknown error'}`);
        }

        if (!authorizeNetResponse.customerProfileId) {
            throw new Error('No customer profile ID returned from Authorize.net');
        }

        // Extract the payment profile ID from the response
        let customerPaymentProfileId: string | undefined;
        if (authorizeNetResponse.customerPaymentProfileIdList && authorizeNetResponse.customerPaymentProfileIdList.length > 0) {
            customerPaymentProfileId = authorizeNetResponse.customerPaymentProfileIdList[0];
        }

        // Update the billing information entry with the profile IDs
        const updatedBillingEntry = await prisma.billingInformationEntries.update({
            where: {
                id: billingInformationEntryId
            },
            data: {
                customerProfileId: authorizeNetResponse.customerProfileId,
                customerPaymentProfileId: customerPaymentProfileId,
                updatedAt: new Date()
            } as any
        });

        return {
            authorizeNetResponse,
            updatedBillingEntry
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error creating customer profile with payment and storing: ${errorMessage}`)
        );
        throw error;
    }
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

        const responseData: CreateTransactionResponse = await response.json();

        return responseData;
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
    errors?: Array<{ errorCode: string, errorText: string }>;
    transactionResponse: any
}): Promise<any> {
    try {
        const paymentTransaction = await prisma.paymentTransactions.create({
            data: {
                userId: transactionData.userId,
                amount: transactionData.amount,
                transId: transactionData.transId,
                accountNumber: transactionData.accountNumber,
                description: transactionData.description,
                status: transactionData.status || 'approved',
                errors: transactionData.errors,
                apiResponse: transactionData.transactionResponse,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        return paymentTransaction;
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

        const responseData: GetCustomerProfileResponse = await response.json();

        return responseData;
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
 * Get a customer payment profile by customerPaymentProfileId from database lookup
 * 
 * @param customerPaymentProfileId - The customer payment profile ID
 * @param includeIssuerInfo - Whether to include issuer information in the response
 * @returns Promise with the payment profile details
 */
export async function getCustomerPaymentProfileById(
    customerPaymentProfileId: string,
    includeIssuerInfo: boolean = false
): Promise<GetCustomerPaymentProfileResponse> {
    try {
        // Find the billing entry with this payment profile ID
        const billingEntry = await prisma.billingInformationEntries.findFirst({
            where: {
                customerPaymentProfileId: customerPaymentProfileId
            }
        });

        if (!billingEntry) {
            throw new Error(`No billing entry found with payment profile ID: ${customerPaymentProfileId}`);
        }

        const customerProfileId = (billingEntry as any).customerProfileId;

        if (!customerProfileId) {
            throw new Error(`No customer profile ID found for payment profile: ${customerPaymentProfileId}`);
        }

        // Get the payment profile from Authorize.net
        return await getCustomerPaymentProfile({
            customerProfileId,
            customerPaymentProfileId,
            includeIssuerInfo
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logError(
            new Error(`Error getting customer payment profile by ID: ${errorMessage}`)
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
        const billingEntry = await prisma.billingInformationEntries.findUnique({
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
            await prisma.billingInformationEntries.update({
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

        // Always create payment transaction record, regardless of success or failure
        const paymentTransaction = await createPaymentTransaction({
            userId: billingEntry.userId,
            amount,
            transId: authorizeNetResponse.transactionResponse.transId,
            transHash: authorizeNetResponse.transactionResponse.transHash,
            accountNumber: authorizeNetResponse.transactionResponse.accountNumber,
            description,
            status: status,
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