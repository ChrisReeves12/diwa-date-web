import * as crypto from 'crypto';
import { logError } from './logging.helpers';
import * as Sentry from "@sentry/nextjs";
import _ from 'lodash';

interface UserData {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbp?: string; // Facebook browser pixel cookie
    fbc?: string; // Facebook click ID cookie
}

interface HashedUserData {
    em?: string[];
    fn?: string[];
    ln?: string[];
    ph?: string[];
    ct?: string[];
    st?: string[];
    zp?: string[];
    country?: string[];
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbp?: string;
    fbc?: string;
}

interface MetaConversionEvent {
    event_name: string;
    event_time: number;
    event_id?: string;
    action_source: string;
    event_source_url?: string;
    user_data: HashedUserData;
    custom_data?: Record<string, any>;
}

/**
 * Hash a value using SHA256 as required by Meta's Conversion API
 */
function hashValue(value: string | undefined): string | undefined {
    if (!value) return undefined;

    // Normalize the value (lowercase and trim)
    const normalized = value.toLowerCase().trim();

    // Return SHA256 hash
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Sends a conversion event to TikTok Event API
 */
export async function sendTikTokConversionEvent(
    eventName: string,
    userData: UserData
) {
    // Only send events in production
    if (process.env.NODE_ENV !== 'production') {
        console.log('TikTok Event API: Skipping event in non-production environment:', eventName);
        return false;
    }

    const hashFields = ['email', 'phone', 'external_id']
    const data: Record<string, any> = {
        event: eventName,
        event_time: Math.floor(Date.now() / 1000),
        user: {}
    };

    _.toPairs(userData).forEach(([key, val]) => {
        if (typeof val !== undefined && val !== null) {
            data.user[key] = hashFields.includes(key) ? hashValue(val) : val;
        }
    })

    try {
        const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
            method: 'POST',
            headers: {
                'Access-Token': process.env.TIKTOK_EVENTS_API_KEY as string,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_source: 'web',
                event_source_id: process.env.TIKTOK_PIXEL_ID,
                data: [data]
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`TikTok Event API error: ${JSON.stringify(result)}`);
        }

        console.log('TikTok Event API event sent successfully:', eventName, result);
        return true;
    } catch (error: any) {
        logError(error, `Failed to send TikTok Event API event: ${eventName}`);
        Sentry.captureException(error, {
            tags: {
                event_name: eventName,
                integration: 'tiktok_event_api'
            }
        });
        return false;
    }
}

/**
 * Send a conversion event to Meta's Conversion API
 */
export async function sendMetaConversionEvent(
    eventName: string,
    userData: UserData,
    customData?: Record<string, any>,
    eventSourceUrl?: string,
    eventId?: string
): Promise<boolean> {
    // Only send events in production
    if (process.env.NODE_ENV !== 'production') {
        console.log('Meta Conversion API: Skipping event in non-production environment:', eventName);
        return false;
    }

    // Check if Meta Conversion API is configured
    const pixelId = process.env.META_DATASET_ID;
    const accessToken = process.env.META_CONVERSION_API_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
        console.log('Meta Conversion API not configured. Skipping event:', eventName);
        return false;
    }

    try {
        // Hash user data as required by Meta - all hashed fields should be arrays
        const hashedUserData: HashedUserData = {};

        if (userData.email) {
            const hashed = hashValue(userData.email);
            if (hashed) hashedUserData.em = [hashed];
        }

        if (userData.firstName) {
            const hashed = hashValue(userData.firstName);
            if (hashed) hashedUserData.fn = [hashed];
        }

        if (userData.lastName) {
            const hashed = hashValue(userData.lastName);
            if (hashed) hashedUserData.ln = [hashed];
        }

        if (userData.phone) {
            const hashed = hashValue(userData.phone);
            if (hashed) hashedUserData.ph = [hashed];
        }

        if (userData.city) {
            const hashed = hashValue(userData.city);
            if (hashed) hashedUserData.ct = [hashed];
        }

        if (userData.state) {
            const hashed = hashValue(userData.state);
            if (hashed) hashedUserData.st = [hashed];
        }

        if (userData.zip) {
            const hashed = hashValue(userData.zip);
            if (hashed) hashedUserData.zp = [hashed];
        }

        if (userData.country) {
            const hashed = hashValue(userData.country);
            if (hashed) hashedUserData.country = [hashed];
        }

        // External ID should also be an array
        if (userData.externalId) {
            hashedUserData.external_id = [userData.externalId];
        }

        // Non-hashed, non-array fields
        if (userData.clientIpAddress) {
            hashedUserData.client_ip_address = userData.clientIpAddress;
        }

        if (userData.clientUserAgent) {
            hashedUserData.client_user_agent = userData.clientUserAgent;
        }

        if (userData.fbp) {
            hashedUserData.fbp = userData.fbp;
        }

        if (userData.fbc) {
            hashedUserData.fbc = userData.fbc;
        }

        // Build the event
        const event: MetaConversionEvent = {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            user_data: hashedUserData
        };

        if (eventId) {
            event.event_id = eventId;
        }

        if (eventSourceUrl) {
            event.event_source_url = eventSourceUrl;
        }

        if (customData) {
            event.custom_data = customData;
        }

        // Send to Meta Conversion API using form data format as per Meta's documentation
        const formData = new URLSearchParams();
        formData.append('data', JSON.stringify([event]));
        formData.append('access_token', accessToken);

        const response = await fetch(
            `https://graph.facebook.com/v24.0/${pixelId}/events`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Meta Conversion API error: ${JSON.stringify(result)}`);
        }

        console.log('Meta Conversion API event sent successfully:', eventName, result);
        return true;
    } catch (error: any) {
        logError(error, `Failed to send Meta Conversion event: ${eventName}`);
        Sentry.captureException(error, {
            tags: {
                event_name: eventName,
                integration: 'meta_conversion_api'
            }
        });
        return false;
    }
}

/**
 * Track a Lead event (user registration)
 */
export async function trackMetaLead(userData: UserData, eventSourceUrl?: string, eventId?: string): Promise<boolean> {
    return sendMetaConversionEvent('Lead', userData, undefined, eventSourceUrl, eventId);
}

/**
 * Track a CompleteRegistration event
 */
export async function trackCompleteRegistration(userData: UserData, eventSourceUrl?: string, eventId?: string): Promise<boolean[]> {
    return Promise.all([
        sendMetaConversionEvent('CompleteRegistration', userData, undefined, eventSourceUrl, eventId),
        sendTikTokConversionEvent('CompleteRegistration', userData)
    ]);
}

/**
 * Track a Purchase event
 */
export async function trackMetaPurchase(
    userData: UserData,
    value: number,
    currency: string,
    eventSourceUrl?: string,
    eventId?: string
): Promise<boolean> {
    return sendMetaConversionEvent(
        'Purchase',
        userData,
        {
            value,
            currency
        },
        eventSourceUrl,
        eventId
    );
}

