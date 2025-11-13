import _ from "lodash";
import { User } from "./types";

// Global alert dialog state
interface AlertState {
    open: boolean;
    title?: string;
    message: string;
}

let alertState: AlertState = {
    open: false,
    message: ''
};

let alertStateUpdater: ((state: AlertState) => void) | null = null;

/**
 * Register the alert state updater function (called from the root component)
 * @param updater Function to update the global alert state
 */
export function registerAlertUpdater(updater: (state: AlertState) => void) {
    alertStateUpdater = updater;
}

/**
 * Fetches the geographical bounds for a given country using its name and code.
 * Utilizes the Google Maps Geocoding service to obtain the geocoding result.
 *
 * @param {Object} country An object representing the country for which to determine geographical bounds.
 * @param {string} country.name The full name of the country (e.g., "United States").
 * @param {string} country.code The ISO 3166-1 alpha-2 region code for the country (e.g., "US").
 * @return {Promise<google.maps.GeocoderResult>} A promise that resolves with the geocoding result if successful,
 *                                               or rejects with an error if the geocoding process fails.
 */
export function getGeoBoundsForCountry(country: { name: string, code: string }) {
    return new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        google.maps.importLibrary("geocoding").then((library) => {
            // @ts-expect-error dynamically loaded library
            const geocoder = new library.Geocoder();
            geocoder.geocode({
                address: country.name,
                region: country.code
            }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
                if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                    resolve(results[0]);
                } else {
                    reject(new Error('Geocoding failed'));
                }
            });
        });
    });
}

/**
 * Checks if a user has been onboarded in which they filled out all the necessary attributes to
 * be visible in search.
 * @param user
 */
export function userHasOnboarded(user: Pick<User, 'numOfPhotos' | 'emailVerifiedAt' | 'profileCompletedAt'>) {
    const issues = { emailVerifiedAt: false, numOfPhotos: false, profileCompletedAt: false };

    if (user.emailVerifiedAt && user.numOfPhotos >= 3 && user.profileCompletedAt) {
        return { hasOnboarded: true, issues };
    }

    if (!user.emailVerifiedAt) {
        issues.emailVerifiedAt = true;
    }

    if (user.numOfPhotos < 3) {
        issues.numOfPhotos = true;
    }

    if (!user.profileCompletedAt) {
        issues.profileCompletedAt = true;
    }

    return { hasOnboarded: false, issues };
}

/**
 * Show a global alert dialog (replacement for window.alert())
 * @param message The message to display
 * @param title Optional title for the dialog
 */
export function showAlert(message: string, title?: string) {
    if (alertStateUpdater) {
        alertState = {
            open: true,
            message,
            title
        };
        alertStateUpdater(alertState);
    } else {
        // Fallback to browser alert if the system isn't initialized yet
        if (typeof window !== 'undefined') {
            alert(message);
        } else {
            console.warn('Alert called during SSR:', message);
        }
    }
}

/**
 * Close the global alert dialog
 */
export function closeAlert() {
    if (alertStateUpdater) {
        alertState = {
            ...alertState,
            open: false
        };
        alertStateUpdater(alertState);
    }
}

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
    if (typeof document === 'undefined') {
        return;
    }

    if (document.getElementById('google-maps-script')) {
        return;
    }

    const script = document.createElement("script");
    script.id = 'google-maps-script';
    script.innerHTML = `
        (g => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = \`https://maps.\${c}apis.com/maps/api/js?\` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
          key: "${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}",
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

/**
 * Generate random string
 * @param length
 */
export function generateCryptoRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = new Uint8Array(length);

    // Generate cryptographically secure random bytes
    crypto.getRandomValues(randomBytes);

    // Convert bytes to characters from our charset
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset[randomBytes[i] % charset.length];
    }

    return result;
}

