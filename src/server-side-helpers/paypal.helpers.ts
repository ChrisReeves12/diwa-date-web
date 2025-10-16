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

/**
 * Get PayPal credentials from environment variables
 */
function getPayPalCredentials() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const apiBaseUrl = process.env.PAYPAL_API_BASE_URL || 'https://api-m.paypal.com';

    if (!clientId || !clientSecret) {
        throw new Error('Missing required PayPal environment variables (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)');
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
 * Cancel a PayPal subscription
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


