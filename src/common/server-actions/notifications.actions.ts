'use server'

import { User } from '@/types'
import { NotificationCenterData } from '@/types/notification-center-data.interface'
import { countAllNotifications, getNotificationCenterData, markNotificationsAsRead } from '@/server-side-helpers/notification.helper'
import { Notification } from '@/types/notification-response.interface'
import { prismaWrite } from '@/lib/prisma'

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

/**
 * Delete a single notification by ID.
 * @param currentUser
 * @param notificationId - The ID of the notification to delete
 */
export async function deleteNotification(currentUser: { id: number }, notificationId: number) {
    await prismaWrite.notifications.deleteMany({
        where: {
            id: notificationId,
            recipientId: currentUser.id
        }
    });
}

/**
 * Delete a specific photo notification by ID for the current user.
 * @param notificationId - The ID of the notification to delete
 */
export async function deletePhotoNotification(notificationId: number) {
    await prismaWrite.notifications.deleteMany({
        where: {
            id: notificationId
        }
    });
}
