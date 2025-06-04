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
