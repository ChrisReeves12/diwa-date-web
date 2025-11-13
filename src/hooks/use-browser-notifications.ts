'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
}

export function useBrowserNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    // Check if browser supports notifications and load preferences
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const supported = 'Notification' in window;
        setIsSupported(supported);

        if (supported) {
            setPermission(Notification.permission);

            // Load preference from localStorage
            const enabled = localStorage.getItem('browserNotificationsEnabled') === 'true';
            setIsEnabled(enabled && Notification.permission === 'granted');
        }
    }, []);

    // Request notification permission from the browser
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn('Browser notifications are not supported');
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                localStorage.setItem('browserNotificationsEnabled', 'true');
                setIsEnabled(true);
                return true;
            } else {
                localStorage.setItem('browserNotificationsEnabled', 'false');
                setIsEnabled(false);
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }, [isSupported]);

    // Toggle notifications on/off
    const toggleNotifications = useCallback(async (): Promise<boolean> => {
        if (!isSupported) return false;

        // If currently disabled, enable and request permission if needed
        if (!isEnabled) {
            if (permission === 'granted') {
                localStorage.setItem('browserNotificationsEnabled', 'true');
                setIsEnabled(true);
                return true;
            } else {
                // Need to request permission
                return await requestPermission();
            }
        } else {
            // Disable notifications
            localStorage.setItem('browserNotificationsEnabled', 'false');
            setIsEnabled(false);
            return false;
        }
    }, [isSupported, isEnabled, permission, requestPermission]);

    // Check if the browser tab is currently visible
    const isTabVisible = useCallback((): boolean => {
        if (typeof document === 'undefined') return true;
        return !document.hidden;
    }, []);

    // Show a browser notification
    const showNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (!isSupported || !isEnabled || permission !== 'granted') {
            return null;
        }

        // Don't show notification if tab is visible
        if (isTabVisible()) {
            return null;
        }

        try {
            const notification = new Notification(title, {
                body: options?.body,
                icon: options?.icon,
                tag: options?.tag,
                requireInteraction: options?.requireInteraction ?? false,
                data: options?.data,
            });

            // Focus window when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();

                // Handle custom click behavior if data contains a URL
                if (options?.data?.url) {
                    window.location.href = options.data.url;
                }
            };

            return notification;
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    }, [isSupported, isEnabled, permission, isTabVisible]);

    return {
        isSupported,
        isEnabled,
        permission,
        requestPermission,
        toggleNotifications,
        showNotification,
        isTabVisible,
    };
}

