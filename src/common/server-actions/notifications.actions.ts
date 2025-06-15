'use server'

import { User } from '@/types'
import { NotificationCenterData } from '@/types/notification-center-data.interface'
import { countAllNotifications, getNotificationCenterData, markNotificationsAsRead } from '@/server-side-helpers/notification.helper'
import { Notification } from '@/types/notification-response.interface'

/**
 * Server action to load notification center data
 * @param currentUser - The authenticated user
 * @returns Promise<NotificationCenterData>
 */
export async function loadNotificationCenterData(currentUser: User): Promise<NotificationCenterData> {
    try {
        return await getNotificationCenterData(currentUser)
    } catch (error) {
        console.error('Error loading notification center data:', error)
        throw new Error('Failed to load notification data');
    }
}

/**
 * Mark given notifications as read.
 * @param currentUser 
 */
export async function markMatchNotificationsAsRead(currentUser: { id: number }, receivedNotifications?: Notification[]) {
    if (receivedNotifications && receivedNotifications.length > 0) {
        await markNotificationsAsRead(currentUser.id, receivedNotifications);
    }

    return await countAllNotifications(currentUser);
}