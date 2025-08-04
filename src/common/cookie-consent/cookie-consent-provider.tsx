'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { CookieConsentContextType, CookieConsentChoice, CookieConsentState } from './cookie-consent.types';

const COOKIE_CONSENT_KEY = 'cookieConsent';

// Create the context with undefined as the default value
const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

// Provider component that wraps the app to provide cookie consent functionality
export function CookieConsentProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CookieConsentState>({
        hasConsented: null,
        showPopup: false
    });

    // Check localStorage on mount (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentChoice;

            if (savedConsent === 'accepted') {
                setState({
                    hasConsented: true,
                    showPopup: false
                });
            } else if (savedConsent === 'declined') {
                setState({
                    hasConsented: false,
                    showPopup: false
                });
            } else {
                // No saved consent, show popup
                setState({
                    hasConsented: null,
                    showPopup: true
                });
            }
        }
    }, []);

    const acceptCookies = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        }
        setState({
            hasConsented: true,
            showPopup: false
        });
    }, []);

    const declineCookies = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
        }
        setState({
            hasConsented: false,
            showPopup: false
        });
    }, []);

    const contextValue: CookieConsentContextType = {
        ...state,
        acceptCookies,
        declineCookies
    };

    return (
        <CookieConsentContext.Provider value={contextValue}>
            {children}
        </CookieConsentContext.Provider>
    );
}

// Custom hook to use the cookie consent context
export function useCookieConsent() {
    const context = useContext(CookieConsentContext);
    if (context === undefined) {
        throw new Error('useCookieConsent must be used within a CookieConsentProvider');
    }
    return context;
}

// Utility function to check consent status (can be used anywhere)
export function getCookieConsentStatus(): CookieConsentChoice {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentChoice;
}

// Utility function to clear consent (useful for testing)
export function clearCookieConsent(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(COOKIE_CONSENT_KEY);
    }
}