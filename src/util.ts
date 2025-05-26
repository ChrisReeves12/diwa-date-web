import _ from "lodash";

/**
 * Returns the URL for a user's profile.
 * @param user The user object.
 * @returns The URL for the user's profile.
 */
export function userProfileLink(user: { id: string | number }) {
    return `/user/${user.id}`;
}

/**
 * Add Google Maps script to head tag.
 */
export function loadGoogleMapsScript() {
    if (document.getElementById('google-maps-script')) {
        return;
    }

    const script = document.createElement("script");
    script.id = 'google-maps-script';
    script.innerHTML = `
        (g => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = \`https://maps.\${c}apis.com/maps/api/js?\` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
          key: "AIzaSyAeGvz0hKkuBNgvpq_D-p2qcfuVpIy3HPQ",
          v: "quarterly",
        });
      `;

    document.head.appendChild(script);
}

/**
 * Convert kilometers to miles.
 * @param kilometers
 * @returns The km expressed in miles
 */
export function kilometersToMiles(kilometers: number): number {
    const milesPerKilometer = 0.621371;
    return _.round(kilometers * milesPerKilometer, 2);
}

/**
 * Returns a human-readable difference between the given date and now.
 * Example outputs: "4 seconds ago", "5 minutes ago", "4 hours ago", "in 2 days"
 *
 * @param date The date to compare with the current date. Can be a Date object or a string.
 * @returns A string representing the time difference.
 */
export function humanizeTimeDiff(date?: Date | string): string {
    if (!date)
        return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    // Calculate difference in seconds
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

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
 * Capitalizes the first letter of a string.
 * @param str The string to capitalize.
 * @returns The string with its first letter capitalized.
 */
export function capitalizeFirstLetter(str?: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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
