import prisma from '@/lib/prisma';
import { User } from "@/types";
import {
    appendMediaRootToImage,
    appendMediaRootToImageUrl,
    calculateUserAge,
    getMainCroppedImageData,
    prepareUser
} from './user.helpers';
import _ from 'lodash';
import { NotificationPendingMatch, NotificationReceivedMessage, Notification, NotificationUser } from '@/types/notification-response.interface';
import { NotificationCenterData } from "@/types/notification-center-data.interface";

/**
 * Get pending matches for a user
 * @param user
 * @returns
 */
export async function getPendingMatches(user: User): Promise<NotificationPendingMatch[]> {
    // Get pending matches where the current user is the recipient
    const pendingMatches = await prisma.userMatches.findMany({
        where: {
            recipientId: user.id,
            status: 'pending'
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        include: {
            users_userMatches_userIdTousers: {
                select: {
                    id: true,
                    displayName: true,
                    mainPhoto: true,
                    locationName: true,
                    country: true,
                    photos: true,
                    gender: true,
                    dateOfBirth: true,
                    lastActiveAt: true
                }
            }
        }
    });

    const mutedUsersPromise = prisma.mutedUsers.findMany({
        select: {
            recipientId: true
        },
        where: {
            userId: user.id,
            recipientId: {
                in: pendingMatches.map((pm: any) => pm.userId)
            }
        }
    });

    const blockedUsersPromise = prisma.blockedUsers.findMany({
        select: {
            blockedUserId: true
        },
        where: {
            userId: user.id,
            blockedUserId: {
                in: pendingMatches.map((pm: any) => pm.userId)
            }
        }
    });

    const [mutedUsers, blockedUsers] = await Promise.all([
        mutedUsersPromise,
        blockedUsersPromise
    ]);

    // Filter out muted and blocked users
    const finalPendingMatches = _.reject(pendingMatches, (pm: any) =>
        _.some(mutedUsers, (mu: any) => mu.recipientId === pm.userId) ||
        _.some(blockedUsers, (bu: any) => bu.blockedUserId === pm.userId)
    );

    return finalPendingMatches.map((pm: any) => {
        const preparedSender = prepareUser(pm.users_userMatches_userIdTousers as any); // prepareUser handles casing

        // Ensure pm.sender conforms to NotificationUser from notification-response.interface.ts
        const senderForNotification: NotificationUser = {
            id: String(preparedSender.id), // Ensure id is string
            displayName: preparedSender.displayName,
            mainPhoto: preparedSender.mainPhoto || '', // Provide fallback for non-optional
            photos: preparedSender.photos || [], // Provide fallback
            gender: preparedSender.gender,
            lastActiveAt: preparedSender.lastActiveAt || new Date(), // Provide fallback
            locationName: preparedSender.locationName || '', // Provide fallback
            country: preparedSender.country || '', // Provide fallback
            password: '', // Not in NotificationUser, but was in original sender select, clear it
            age: preparedSender.age,
            isSubscriptionActive: preparedSender.isSubscriptionActive,
            publicMainPhoto: preparedSender.publicMainPhoto || '', // Provide fallback
            publicPhotos: preparedSender.publicPhotos || [], // Provide fallback
        };

        return {
            ...pm,
            id: typeof pm.id === 'bigint' ? pm.id.toString() : pm.id,
            userId: typeof pm.userId === 'bigint' ? pm.userId.toString() : pm.userId,
            recipientId: typeof pm.recipientId === 'bigint' ? pm.recipientId.toString() : (pm.recipientId === null ? '' : pm.recipientId),
            acceptedAt: pm.acceptedAt instanceof Date ? pm.acceptedAt.toISOString() : (pm.acceptedAt ?? ''),
            acknowledgedAt: pm.acknowledgedAt instanceof Date ? pm.acknowledgedAt.toISOString() : (pm.acknowledgedAt ?? ''),
            createdAt: pm.createdAt instanceof Date ? pm.createdAt.toISOString() : (pm.createdAt ?? ''),
            updatedAt: pm.updatedAt instanceof Date ? pm.updatedAt.toISOString() : (pm.updatedAt ?? ''),
            updatedAtTimestamp: typeof pm.updatedAtTimestamp === 'bigint' ? pm.updatedAtTimestamp.toString() : (pm.updatedAtTimestamp ?? ''),
            sender: senderForNotification // Assign the correctly shaped sender
        };
    });
}

/**
 * Creates a promise to fetch notification center data.
 * @param currentUser
 */
export async function createNotificationCenterDataPromise(currentUser: User): Promise<NotificationCenterData> {
    return Promise.all([
        getPendingMatches(currentUser),
        getReceivedMessages(currentUser),
        getPendingNotifications(currentUser),
        countAllPendingMatches(currentUser),
        countAllMessages(currentUser),
        countAllNotifications(currentUser)
    ]).then(([pendingMatches, receivedMessages, receivedNotifications, pendingMatchesCount, receivedMessagesCount, notificationCount]) => {
        return {
            pendingMatches,
            receivedMessages,
            pendingMatchesCount,
            receivedMessagesCount,
            receivedNotifications,
            notificationCount
        };
    });
}

/**
 * Get received messages for a user
 * @param user
 * @returns
 */
export async function getReceivedMessages(user: User): Promise<NotificationReceivedMessage[]> {
    const results = await prisma.$queryRaw`
        SELECT S.* FROM (
                    SELECT M.*,
                       U."displayName",
                       U."mainPhoto",
                       U."photos",
                       Calculate_Age(U."dateOfBirth") AS "age",
                       U."lastActiveAt",
                       U."suspendedAt",
                       U."locationName",
                       U."gender" AS "userGender",
                       LEAST(COUNT(M.id) OVER (PARTITION BY M."userId"), 100) AS "msgCount",
                       CASE WHEN MAX(M."timestamp") OVER (PARTITION BY M."userId") = M."timestamp" THEN 1 ELSE 0 END AS "isLatest"
                    FROM "messages" M
                        JOIN "users" U ON M."userId" = U.id AND M."userId" NOT IN (SELECT "blockedUserId" FROM "blockedUsers" _BU WHERE _BU."userId" = ${user.id})
                    WHERE M."recipientId" = ${user.id}
                        ) S
        WHERE S."isLatest" = 1
        ORDER BY S."timestamp" DESC LIMIT 5
    `;

    return (results as NotificationReceivedMessage[]).map(m => {
        const retVal = {
            ...m,
            ...{
                photos: Array.isArray(m.photos) ? m.photos.map(p => appendMediaRootToImage(p)) : [],
                publicMainPhoto: m.mainPhoto ? appendMediaRootToImageUrl(m.mainPhoto) : undefined,
                mainPhotoCroppedImageData: getMainCroppedImageData(m),
                msgCount: Number(m.msgCount)
            }
        };

        return retVal as NotificationReceivedMessage;
    });
}

/**
 * Count all pending matches received by the user, excluding those from muted or blocked users.
 * @param user The recipient user.
 * @returns A promise that resolves to the total count of pending matches after filtering.
 */
export async function countAllPendingMatches(user: User): Promise<number> {
    const mutedUsersPromise = prisma.mutedUsers.findMany({
        select: { recipientId: true },
        where: { userId: user.id }
    });

    const blockedUsersPromise = prisma.blockedUsers.findMany({
        select: { blockedUserId: true },
        where: { userId: user.id }
    });

    const [mutedUsers, blockedUsers] = await Promise.all([
        mutedUsersPromise,
        blockedUsersPromise
    ]);

    const excludedUserIds = [
        ...mutedUsers.map((mu: any) => mu.recipientId),
        ...blockedUsers.map((bu: any) => bu.blockedUserId)
    ];

    return prisma.userMatches.count({
        where: {
            recipientId: user.id,
            status: 'pending',
            userId: {
                notIn: excludedUserIds.length > 0 ? excludedUserIds : undefined
            }
        }
    });
}

/**
 * Count all unique users who sent messages to the given user, excluding blocked users.
 * @param user The recipient user.
 * @returns A promise that resolves to the total count of unique senders.
 */
export async function countAllMessages(user: User): Promise<number> {
    const result = await prisma.$queryRaw<{ totalCount: number }[]>`
        SELECT COUNT(DISTINCT M."userId") as "totalCount"
        FROM "messages" M
        WHERE M."recipientId" = ${user.id}
          AND M."userId" NOT IN (SELECT "blockedUserId" FROM "blockedUsers" _BU WHERE _BU."userId" = ${user.id})
    `;

    if (result && result.length > 0 && result[0].totalCount !== undefined) {
        return Number(result[0].totalCount);
    }

    return 0;
}

/**
 * Get pending notifications for a user
 * @param user The recipient user.
 * @returns A promise that resolves to an array of the top 5 most recent notifications.
 */
export async function getPendingNotifications(user: User): Promise<Notification[]> {
    const notifications = await prisma.notifications.findMany({
        where: {
            recipientId: user.id,
            readAt: null,
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        include: {
            users_notifications_userIdTousers: {
                select: {
                    id: true,
                    displayName: true,
                    mainPhoto: true,
                    locationName: true,
                    country: true,
                    photos: true,
                    gender: true,
                    dateOfBirth: true,
                    lastActiveAt: true
                }
            }
        }
    });

    return notifications.map((n: any) => {
        const preparedSender = prepareUser(n.users_notifications_userIdTousers as any);
        const senderForNotification: NotificationUser = {
            id: String(preparedSender.id),
            displayName: preparedSender.displayName,
            mainPhoto: preparedSender.mainPhoto || '',
            photos: preparedSender.photos || [],
            gender: preparedSender.gender,
            lastActiveAt: preparedSender.lastActiveAt || new Date(),
            locationName: preparedSender.locationName || '',
            country: preparedSender.country || '',
            password: '',
            age: preparedSender.age,
            isSubscriptionActive: preparedSender.isSubscriptionActive,
            publicMainPhoto: preparedSender.publicMainPhoto || '',
            publicPhotos: preparedSender.publicPhotos || [],
        };

        // Ensure data has match_id property
        let notificationData: { match_id: number } = { match_id: 0 }; // Default value
        if (n.data && typeof n.data === 'object' && 'match_id' in n.data && typeof n.data.match_id === 'number') {
            notificationData = { match_id: n.data.match_id };
        }

        return {
            ...n,
            id: typeof n.id === 'bigint' ? n.id.toString() : n.id,
            userId: typeof n.userId === 'bigint' ? n.userId.toString() : n.userId,
            recipientId: typeof n.recipientId === 'bigint' ? n.recipientId.toString() : (n.recipientId === null ? '' : n.recipientId),
            createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : (n.createdAt ?? ''),
            updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : (n.updatedAt ?? ''),
            readAt: n.readAt instanceof Date ? n.readAt.toISOString() : (n.readAt ?? ''),
            data: notificationData, // Assign the correctly shaped data
            sender: senderForNotification
        };
    });
}

/**
 * Count all unread notifications for a user
 * @param user The recipient user.
 * @returns A promise that resolves to the total count of unread notifications.
 */
export async function countAllNotifications(user: User): Promise<number> {
    return prisma.notifications.count({
        where: {
            recipientId: user.id,
            readAt: null
        }
    });
}
