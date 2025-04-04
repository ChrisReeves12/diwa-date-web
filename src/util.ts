/**
 * Transforms BigInt values to strings in the given data.
 * @param data The data to transform.
 * @returns 
 */
export function transformBigInts<T>(data: any): T {
    return JSON.parse(
        JSON.stringify(data, (_, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    );
}

/**
 * Returns the URL for a user's profile.
 * @param user The user object.
 * @returns The URL for the user's profile.
 */
export function userProfileLink(user: { id: bigint | string }) {
    return `/profile/${user.id}`;
}

/**
 * Returns a human-readable difference between the given date and now.
 * Example outputs: "4 seconds ago", "5 minutes ago", "4 hours ago", "in 2 days"
 * 
 * @param date The date to compare with the current date.
 * @returns A string representing the time difference.
 */
export function diffForHumans(date: Date): string {
    const now = new Date();
    // Calculate difference in seconds
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // If exactly now, return 'just now'
    if (diffInSeconds === 0) {
        return "just now";
    }

    const isPast = diffInSeconds > 0;
    const diff = Math.abs(diffInSeconds);

    // Define time units in seconds (approximate for months and years)
    const units: { [key: string]: number } = {
        year: 31536000,   // 365 days
        month: 2592000,   // 30 days
        day: 86400,       // 24 hours
        hour: 3600,       // 60 minutes
        minute: 60,       // 60 seconds
        second: 1
    };

    // Find the largest unit that fits the difference
    for (const unit in units) {
        const unitSeconds = units[unit];
        if (diff >= unitSeconds) {
            const value = Math.floor(diff / unitSeconds);
            const unitLabel = value === 1 ? unit : `${unit}s`;
            return isPast ? `${value} ${unitLabel} ago` : `in ${value} ${unitLabel}`;
        }
    }

    return "just now";
}

/**
 * Perform an AJAX request that recognizes authentication.
 * @param method
 * @param url
 * @param window
 * @param body
 * @param criticalErrMsg
 */
export async function authAPIRequest<T>(method: string, url: string,
    window: Window,
    body?: object,
    criticalErrMsg?: string) {
    try {
        const response = await fetch(url, { method, headers: { 'content-type': 'application/json' } });
        if (response.ok) {
            return ({ response, body: (await response.json()) as T, success: true });
        }

        if (response.status === 401) {
            // Unauthorized
            window.location.href = '/';
            return;
        }

        return ({
            response,
            success: false,
            body: undefined,
            errorData: await response.json()
        });
    } catch (err) {
        window.alert(criticalErrMsg || 'An error occurred while making request.');
        console.error(err);
    }
}

/**
 * Decodes HTML entities in a given string.
 * @param str The string to decode.
 * @returns The decoded string.
 */
export function decodeHtmlEntities(str: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
}
