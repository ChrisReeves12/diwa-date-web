'use server'

import { User } from '@/types'
import { NotificationCenterData } from '@/types/notification-center-data.interface'
import { createNotificationCenterDataPromise } from '@/server-side-helpers/notification.helper'

/**
 * Server action to load notification center data
 * @param currentUser - The authenticated user
 * @returns Promise<NotificationCenterData>
 */
export async function loadNotificationCenterData(currentUser: User): Promise<NotificationCenterData> {
    try {
        return await createNotificationCenterDataPromise(currentUser)
    } catch (error) {
        console.error('Error loading notification center data:', error)
        throw new Error('Failed to load notification data')
    }
} 