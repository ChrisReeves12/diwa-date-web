export interface CookieConsentState {
    hasConsented: boolean | null; // null = not decided, true = accepted, false = declined
    showPopup: boolean;
}

export interface CookieConsentContextType extends CookieConsentState {
    acceptCookies: () => void;
    declineCookies: () => void;
}

export type CookieConsentChoice = 'accepted' | 'declined' | null;