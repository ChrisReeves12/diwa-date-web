'use client';

import './browser-notification-banner.scss';
import { useState, useEffect } from 'react';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';

export default function BrowserNotificationBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const { isSupported, permission, requestPermission } = useBrowserNotifications();

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        // Check if we should show the banner
        const promptShown = localStorage.getItem('browserNotificationPromptShown') === 'true';

        // Show banner if:
        // 1. Browser supports notifications
        // 2. User hasn't been prompted before
        // 3. Permission is still at default (not granted or denied)
        if (isSupported && !promptShown && permission === 'default') {
            // Show after a short delay to not overwhelm the user on page load
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isSupported, permission]);

    const handleEnable = async () => {
        const granted = await requestPermission();

        // Mark as shown regardless of the result
        localStorage.setItem('browserNotificationPromptShown', 'true');
        setIsVisible(false);

        if (granted) {
            console.log('Browser notifications enabled');
        }
    };

    const handleMaybeLater = () => {
        localStorage.setItem('browserNotificationPromptShown', 'true');
        setIsVisible(false);
    };

    // Don't render if not visible
    if (!isVisible) {
        return null;
    }

    return (
        <div className="browser-notification-banner">
            <div className="banner-content">
                <div className="banner-icon">
                    <i className="las la-bell"></i>
                </div>
                <div className="banner-text">
                    <h4>Stay Connected!</h4>
                    <p>Get notified instantly when you receive new matches and messages, even when you&apos;re browsing other tabs.</p>
                </div>
                <div className="banner-actions">
                    <button className="btn-primary" onClick={handleEnable}>
                        <i className="las la-check"></i> Enable Notifications
                    </button>
                    <button className="btn-secondary" onClick={handleMaybeLater}>
                        Maybe Later
                    </button>
                </div>
                <button className="banner-close" onClick={handleMaybeLater} aria-label="Close">
                    <i className="las la-times"></i>
                </button>
            </div>
        </div>
    );
}

