/**
 * PayPal API Helper Functions
 * Handles PayPal subscription management operations
 */

interface PayPalAccessTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface PayPalError {
    name?: string;
    message?: string;
    details?: Array<{
        issue: string;
        description: string;
    }>;
}

interface PayPalSubscriptionResponse {
    id: string;
    status: string;
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

/**
 * Get PayPal credentials from environment variables
 */
function getPayPalCredentials() {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const apiBaseUrl = process.env.PAYPAL_API_BASE_URL || 'https://api-m.paypal.com';

    if (!clientId || !clientSecret) {
        throw new Error('Missing required PayPal environment variables (NEXT_PUBLIC_PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)');
    }

    return {
        clientId,
        clientSecret,
        apiBaseUrl
    };
}

/**
 * Get PayPal OAuth access token
 * @returns Access token for PayPal API calls
 */
async function getPayPalAccessToken(): Promise<string> {
    const { clientId, clientSecret, apiBaseUrl } = getPayPalCredentials();

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await fetch(`${apiBaseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to get PayPal access token: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data: PayPalAccessTokenResponse = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting PayPal access token:', error);
        throw error;
    }
}

/**
 * Suspend a PayPal subscription (can be reactivated later)
 * @param subscriptionId - The PayPal subscription ID to suspend
 * @param reason - Optional reason for suspension
 * @returns Success status
 */
export async function suspendPayPalSubscription(
    subscriptionId: string,
    reason: string = 'User requested suspension'
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!subscriptionId) {
            return { success: false, error: 'No PayPal subscription ID provided' };
        }

        const accessToken = await getPayPalAccessToken();
        const { apiBaseUrl } = getPayPalCredentials();

        const response = await fetch(
            `${apiBaseUrl}/v1/billing/subscriptions/${subscriptionId}/suspend`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason
                }),
            }
        );

        // PayPal returns 204 No Content on successful suspension
        if (response.status === 204) {
            console.log(`Successfully suspended PayPal subscription: ${subscriptionId}`);
            return { success: true };
        }

        // If not 204, try to get error details
        const errorData: PayPalError = await response.json().catch(() => ({}));

        console.error('PayPal subscription suspension failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
        });

        return {
            success: false,
            error: errorData.message || `PayPal suspension failed with status ${response.status}`
        };
    } catch (error) {
        console.error('Error suspending PayPal subscription:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred while suspending PayPal subscription'
        };
    }
}

/**
 * Activate a PayPal subscription (reactivate a suspended subscription)
 * @param subscriptionId - The PayPal subscription ID to activate
 * @param reason - Optional reason for activation
 * @returns Success status
 */
export async function activatePayPalSubscription(
    subscriptionId: string,
    reason: string = 'User requested reactivation'
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!subscriptionId) {
            return { success: false, error: 'No PayPal subscription ID provided' };
        }

        const accessToken = await getPayPalAccessToken();
        const { apiBaseUrl } = getPayPalCredentials();

        const response = await fetch(
            `${apiBaseUrl}/v1/billing/subscriptions/${subscriptionId}/activate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason
                }),
            }
        );

        // PayPal returns 204 No Content on successful activation
        if (response.status === 204) {
            console.log(`Successfully activated PayPal subscription: ${subscriptionId}`);
            return { success: true };
        }

        // If not 204, try to get error details
        const errorData: PayPalError = await response.json().catch(() => ({}));

        console.error('PayPal subscription activation failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
        });

        return {
            success: false,
            error: errorData.message || `PayPal activation failed with status ${response.status}`
        };
    } catch (error) {
        console.error('Error activating PayPal subscription:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred while activating PayPal subscription'
        };
    }
}

/**
 * Cancel a PayPal subscription (permanent cancellation)
 * @param subscriptionId - The PayPal subscription ID to cancel
 * @param reason - Optional reason for cancellation
 * @returns Success status
 */
export async function cancelPayPalSubscription(
    subscriptionId: string,
    reason: string = 'User requested cancellation'
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!subscriptionId) {
            return { success: false, error: 'No PayPal subscription ID provided' };
        }

        const accessToken = await getPayPalAccessToken();
        const { apiBaseUrl } = getPayPalCredentials();

        const response = await fetch(
            `${apiBaseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason
                }),
            }
        );

        // PayPal returns 204 No Content on successful cancellation
        if (response.status === 204) {
            console.log(`Successfully cancelled PayPal subscription: ${subscriptionId}`);
            return { success: true };
        }

        // If not 204, try to get error details
        const errorData: PayPalError = await response.json().catch(() => ({}));

        console.error('PayPal subscription cancellation failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
        });

        return {
            success: false,
            error: errorData.message || `PayPal cancellation failed with status ${response.status}`
        };
    } catch (error) {
        console.error('Error cancelling PayPal subscription:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred while cancelling PayPal subscription'
        };
    }
}

/**
 * Get PayPal subscription details
 * @param subscriptionId - The PayPal subscription ID
 * @returns Subscription details or null if not found
 */
export async function getPayPalSubscriptionDetails(subscriptionId: string): Promise<any> {
    try {
        if (!subscriptionId) {
            return null;
        }

        const accessToken = await getPayPalAccessToken();
        const { apiBaseUrl } = getPayPalCredentials();

        const response = await fetch(
            `${apiBaseUrl}/v1/billing/subscriptions/${subscriptionId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to get PayPal subscription details:', errorData);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting PayPal subscription details:', error);
        return null;
    }
}

/**
 * Create a PayPal subscription via API
 * @param paypalPlanId - The PayPal plan ID
 * @param returnUrl - URL to redirect to after approval
 * @param cancelUrl - URL to redirect to if user cancels
 * @returns Subscription ID and approval URL
 */
export async function createPayPalSubscription(
    paypalPlanId: string,
    returnUrl: string,
    cancelUrl: string
): Promise<{ success: boolean; subscriptionId?: string; approvalUrl?: string; error?: string }> {
    try {
        if (!paypalPlanId) {
            return { success: false, error: 'PayPal plan ID is required' };
        }

        const accessToken = await getPayPalAccessToken();
        const { apiBaseUrl } = getPayPalCredentials();

        const requestBody = {
            plan_id: paypalPlanId,
            application_context: {
                brand_name: 'Diwa Date',
                locale: 'en-US',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
                payment_method: {
                    payer_selected: 'PAYPAL',
                    payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                },
                return_url: returnUrl,
                cancel_url: cancelUrl
            }
        };

        const response = await fetch(
            `${apiBaseUrl}/v1/billing/subscriptions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData: PayPalError = await response.json().catch(() => ({}));
            console.error('Failed to create PayPal subscription:', {
                status: response.status,
                error: errorData
            });
            return {
                success: false,
                error: errorData.message || `Failed to create PayPal subscription: ${response.status}`
            };
        }

        const data: PayPalSubscriptionResponse = await response.json();

        // Find the approval URL from the links
        const approvalLink = data.links.find(link => link.rel === 'approve');

        if (!approvalLink) {
            console.error('No approval link found in PayPal response');
            return { success: false, error: 'No approval URL received from PayPal' };
        }

        console.log(`Successfully created PayPal subscription: ${data.id}`);

        return {
            success: true,
            subscriptionId: data.id,
            approvalUrl: approvalLink.href
        };
    } catch (error) {
        console.error('Error creating PayPal subscription:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred while creating PayPal subscription'
        };
    }
}

/**
 * Verify and activate a PayPal subscription after user approval
 * @param subscriptionId - The PayPal subscription ID to verify
 * @returns Success status and subscription details
 */
export async function verifyPayPalSubscription(
    subscriptionId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
        if (!subscriptionId) {
            return { success: false, error: 'Subscription ID is required' };
        }

        // Get the subscription details to verify it's active
        const subscriptionDetails = await getPayPalSubscriptionDetails(subscriptionId);

        if (!subscriptionDetails) {
            return { success: false, error: 'Failed to retrieve subscription details from PayPal' };
        }

        // Check if subscription is in an acceptable state
        // PayPal subscription statuses: APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED
        const validStatuses = ['APPROVED', 'ACTIVE'];

        if (!validStatuses.includes(subscriptionDetails.status)) {
            console.error('PayPal subscription not in valid state:', subscriptionDetails.status);
            return {
                success: false,
                error: `Subscription is not active. Current status: ${subscriptionDetails.status}`
            };
        }

        console.log(`Successfully verified PayPal subscription: ${subscriptionId} (${subscriptionDetails.status})`);

        return {
            success: true,
            status: subscriptionDetails.status
        };
    } catch (error) {
        console.error('Error verifying PayPal subscription:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred while verifying PayPal subscription'
        };
    }
}
