import { prismaRead, prismaWrite } from '@/lib/prisma';
import { User, UserPhoto } from "@/types";
import {
    appendMediaRootToImage,
    appendMediaRootToImageUrl,
    calculateUserAge,
    getMainCroppedImageData,
    getPublicUserDetails
} from './user.helpers';
import _ from 'lodash';
import { NotificationPendingMatch, NotificationReceivedMessage, Notification, NotificationUser } from '@/types/notification-response.interface';
import { NotificationCenterData } from "@/types/notification-center-data.interface";
import { humanizeTimeDiff } from "@/server-side-helpers/time.helpers";

type DbPendingMatch = {
    matchId: number;
    userId: number;
    displayName: string;
    mainPhoto: string;
    locationName: string;
    country: string;
    age: number;
    photos: UserPhoto[];
    gender: string;
    dateOfBirth: Date;
    receivedAt: Date;
    lastActiveAt: Date;
};

type DbNotification = {
    id: number;
    userId: number;
    recipientId: number;
    type: string;
    readAt?: Date;
    data?: { matchId: number };
    createdAt: Date;
    updatedAt: Date;
    users_notifications_userIdTousers: {
        id: number;
        displayName: string;
        mainPhoto?: string;
        locationName: string;
        country: string;
        photos?: UserPhoto[];
        gender: string;
        dateOfBirth: string;
        lastActiveAt: Date;
    };
};

/**
 * Get pending matches for a user
 * @param user
 * @returns
 */
export async function getPendingMatches(user: User): Promise<NotificationPendingMatch[]> {
    const pendingMatches: DbPendingMatch[] = await prismaRead.$queryRaw`
        SELECT 
            UM."id" as "matchId",
            UM."createdAt" as "receivedAt",
            U."id" as "userId",
            U."displayName", 
            U."mainPhoto", 
            U."locationName", 
            U."country", 
            U."photos", 
            U."gender", 
            U."dateOfBirth",
            Calculate_Age(U."dateOfBirth") AS "age",
            U."lastActiveAt" 
        FROM "userMatches" UM
            INNER JOIN "users" U ON U."id" = UM."userId" AND U."suspendedAt" IS NULL
            LEFT JOIN "mutedUsers" MU ON MU."userId" = ${user.id} AND MU."recipientId" = UM."userId"
            LEFT JOIN "blockedUsers" BU ON BU."blockedUserId" = ${user.id} AND MU."userId" = BU."userId"
        WHERE MU."recipientId" IS NULL AND BU."blockedUserId" IS NULL AND UM."status" = 'pending'
          AND U."profileCompletedAt" IS NOT NULL
          AND UM."recipientId" = ${user.id}
        ORDER BY UM."createdAt" DESC LIMIT 5
    `;

    return pendingMatches.map((pm: DbPendingMatch) => {
        const preparedSender = Object
            .assign({},
                {
                    id: pm.userId,
                    displayName: pm.displayName,
                    gender: pm.gender,
                    lastActiveAt: pm.lastActiveAt,
                    locationName: pm.locationName,
                    country: pm.country,
                    age: pm.age
                }, getPublicUserDetails({ mainPhoto: pm.mainPhoto, photos: pm.photos }));

        return {
            id: pm.matchId,
            receivedAtHumanized: humanizeTimeDiff(pm.receivedAt),
            sender: {
                id: preparedSender.id,
                locationName: preparedSender.locationName,
                gender: preparedSender.gender,
                displayName: preparedSender.displayName,
                mainPhotoCroppedImageData: preparedSender.mainPhotoCroppedImageData,
                publicMainPhoto: preparedSender.publicMainPhoto,
                age: preparedSender.age
            }
        };
    });
}

/**
 * Fetch notification center data.
 * @param currentUser
 */
export async function getNotificationCenterData(currentUser: User): Promise<NotificationCenterData> {
    return Promise.all([
        getPendingMatches(currentUser),
        getReceivedMessages(currentUser),
        getPendingNotifications(currentUser),
        countAllPendingMatches(currentUser),
        countAllMessages(currentUser),
        countAllNotifications(currentUser)
    ]).then(([pendingMatches, receivedMessages, receivedNotifications,
                                   pendingMatchesCount, receivedMessagesCount, notificationCount]) => {
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
 * Get received messages for a user, only returning unread messages
 * @param user
 * @returns
 */
export async function getReceivedMessages(user: User): Promise<NotificationReceivedMessage[]> {
    const results = await prismaRead.$queryRaw`
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
            WHERE M."recipientId" = ${user.id} AND M."readAt" IS NULL) S
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
                msgCount: Number(m.msgCount),
                sentAtHumanized: humanizeTimeDiff(m.createdAt)
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
    const mutedUsersPromise = prismaRead.mutedUsers.findMany({
        select: { recipientId: true },
        where: { userId: user.id }
    });

    const blockedUsersPromise = prismaRead.blockedUsers.findMany({
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

    return prismaRead.userMatches.count({
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
 * Count all unique users who sent unread messages to the given user, excluding blocked users.
 * @param user The recipient user.
 * @returns A promise that resolves to the total count of unique senders.
 */
export async function countAllMessages(user: User): Promise<number> {
    const result = await prismaRead.$queryRaw<{ totalCount: number }[]>`
        SELECT COUNT(DISTINCT M."userId") as "totalCount"
        FROM "messages" M
        WHERE M."recipientId" = ${user.id}
          AND M."readAt" IS NULL
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
    const notifications = await prismaRead.notifications.findMany({
        where: {
            recipientId: user.id
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        select: {
            id: true,
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

    return (notifications as unknown as DbNotification[]).map((notification: DbNotification) => {
        const senderPublicDetails = getPublicUserDetails(notification.users_notifications_userIdTousers);

        return {
            id: notification.id,
            sender: {
                id: notification.users_notifications_userIdTousers.id,
                gender: notification.users_notifications_userIdTousers.gender,
                displayName: notification.users_notifications_userIdTousers.displayName,
                mainPhotoCroppedImageData: senderPublicDetails.mainPhotoCroppedImageData,
                publicMainPhoto: senderPublicDetails.publicMainPhoto,
                age: calculateUserAge(notification.users_notifications_userIdTousers),
                locationName: notification.users_notifications_userIdTousers.locationName
            }
        }
    });
}

/**
 * Mark notifications as read.
 * @param userId
 * @param receivedNotifications
 */
export async function markNotificationsAsRead(userId: number, receivedNotifications: Notification[]) {
    if (receivedNotifications.length === 0) {
        return;
    }

    const notificationIds = receivedNotifications.map(notification =>
        typeof notification.id === 'string' ? parseInt(notification.id) : notification.id
    );

    await prismaWrite.notifications.updateMany({
        where: {
            id: {
                in: notificationIds
            },
            recipientId: userId,
            readAt: null
        },
        data: {
            readAt: new Date()
        }
    });
}

/**
 * Count all unread notifications for a user
 * @param user The recipient user.
 * @returns A promise that resolves to the total count of unread notifications.
 */
export async function countAllNotifications(user: { id: number }): Promise<number> {
    return prismaRead.notifications.count({
        where: {
            recipientId: user.id,
            readAt: null
        }
    });
}
