import { prismaRead, prismaWrite } from '@/lib/prisma';
import { User, UserPhoto } from "@/types";
import {
    appendMediaRootToImage,
    appendMediaRootToImageUrl,
    calculateUserAge,
    getMainCroppedImageData,
    getPublicUserDetails
} from './user.helpers';
import { NotificationPendingMatch, NotificationReceivedMessage, Notification } from '@/types/notification-response.interface';
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
        WITH "receivedMessages" AS (
            SELECT S.* FROM (
                SELECT
                    'message' AS "type",
                    M.*,
                    U."displayName",
                    U."mainPhoto",
                    U."photos",
                    Calculate_Age(U."dateOfBirth") AS "age",
                    U."lastActiveAt",
                    U."suspendedAt",
                    U."locationName",
                    U."gender" AS "userGender",
                    LEAST(COUNT(M.id) OVER (PARTITION BY M."userId"), 100) AS "msgCount",
                    CASE WHEN MAX(M."timestamp") OVER (PARTITION BY M."userId") = M."timestamp" THEN 1 ELSE 0 END AS "isLatest",
                    MAX(M."createdAt") OVER (PARTITION BY M."userId") AS "latestCreatedAt"
                FROM "messages" M
                    JOIN "users" U ON M."userId" = U.id AND U."suspendedAt" IS NULL AND M."userId"
                        NOT IN (SELECT "blockedUserId" FROM "blockedUsers" _BU WHERE _BU."userId" = ${user.id})
                WHERE M."recipientId" = ${user.id} AND M."readAt" IS NULL) S
            WHERE S."isLatest" = 1
        ),

        "receivedMatches" AS (
            SELECT
                'match' AS "type",
                UM."id",
                UM."id" AS "matchId",
                '' AS "content",
                UM."acknowledgedAt" AS "readAt",
                NOW() AS "notificationAckAt",
                UM."userId",
                UM."recipientId",
                UM."updatedAtTimestamp" AS "timestamp",
                UM."createdAt",
                UM."updatedAt",
                U."displayName",
                U."mainPhoto",
                U."photos",
                CALCULATE_AGE(U."dateOfBirth") AS "age",
                U."lastActiveAt",
                U."suspendedAt",
                U."locationName",
                U."gender" AS "userGender",
                0 AS "msgCount",
                0 AS "isLatest",
                UM."createdAt" AS "latestCreatedAt"
            FROM "userMatches" UM
            LEFT JOIN "blockedUsers" BU ON
                (BU."blockedUserId" = ${user.id} AND BU."userId" IN (UM."userId", UM."recipientId")) OR
                (BU."userId" = ${user.id} AND BU."blockedUserId" IN (UM."userId", UM."recipientId"))
            INNER JOIN "users" U ON U."id" = CASE WHEN UM."userId" = ${user.id} THEN UM."recipientId" ELSE UM."userId" END
            WHERE UM."status" = 'matched' AND UM."acknowledgedAt" IS NULL
                AND BU."id" IS NULL
                AND U."suspendedAt" IS NULL
                AND (UM."recipientId" = ${user.id} OR UM."userId" = ${user.id})
                AND NOT EXISTS(SELECT 1 FROM "messages" M WHERE M."matchId" = UM."id")
        ),

        "combinedRows" AS (
            SELECT * FROM "receivedMessages" UNION ALL SELECT * FROM "receivedMatches"
        )

        SELECT * FROM "combinedRows" ORDER BY "latestCreatedAt" DESC LIMIT 5`;

    return (results as any[]).map(m => {
        const retVal = {
            ...m,
            ...{
                photos: Array.isArray(m.photos) ? m.photos.map((p: UserPhoto) => appendMediaRootToImage(p)) : [],
                publicMainPhoto: m.mainPhoto ? appendMediaRootToImageUrl(m.mainPhoto) : undefined,
                mainPhotoCroppedImageData: getMainCroppedImageData(m),
                msgCount: m.type === 'message' ? Number(m.msgCount) : 0,
                sentAtHumanized: humanizeTimeDiff(m.latestCreatedAt)
            }
        };

        return retVal as NotificationReceivedMessage;
    });
}

/**
 * Count all pending matches received by the user, excluding those from muted, blocked, or suspended users.
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
            },
            users_userMatches_userIdTousers: {
                suspendedAt: null
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
        WITH "messageCountResult" AS (
            SELECT COUNT(DISTINCT M."userId") as "messageCount"
                FROM "messages" M
            WHERE M."recipientId" = ${user.id}
            AND M."readAt" IS NULL
            AND M."userId" NOT IN (SELECT "blockedUserId" FROM "blockedUsers" _BU WHERE _BU."userId" = ${user.id})),

            "noMessageUnreadMatchCountResult" AS (
                SELECT COUNT(DISTINCT(UM."id")) as "unreadMatchCount"
                    FROM "userMatches" UM
                LEFT JOIN "blockedUsers" BU ON
                    (BU."blockedUserId" = ${user.id} AND BU."userId" IN (UM."userId", UM."recipientId")) OR
                    (BU."userId" = ${user.id} AND BU."blockedUserId" IN (UM."userId", UM."recipientId"))
                INNER JOIN "users" U ON U."id" = CASE WHEN UM."userId" = ${user.id} THEN UM."recipientId" ELSE UM."userId" END
                WHERE UM."status" = 'matched' AND UM."acknowledgedAt" IS NULL
                    AND BU."id" IS NULL
                    AND U."suspendedAt" IS NULL
                    AND (UM."recipientId" = ${user.id} OR UM."userId" = ${user.id})
                    AND NOT EXISTS(SELECT 1 FROM "messages" M WHERE M."matchId" = UM."id")
            )

        SELECT ((SELECT "messageCount" FROM "messageCountResult") +
                (SELECT "unreadMatchCount" FROM "noMessageUnreadMatchCountResult")) as "totalCount"
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
            data: true,
            type: true,
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
        const senderPublicDetails = !!notification.users_notifications_userIdTousers ?
            getPublicUserDetails(notification.users_notifications_userIdTousers) : null;

        return {
            id: notification.id,
            data: notification.data!,
            sender: senderPublicDetails ? {
                id: notification.users_notifications_userIdTousers.id,
                gender: notification.users_notifications_userIdTousers.gender,
                displayName: notification.users_notifications_userIdTousers.displayName,
                mainPhotoCroppedImageData: senderPublicDetails.mainPhotoCroppedImageData,
                publicMainPhoto: senderPublicDetails.publicMainPhoto,
                age: calculateUserAge(notification.users_notifications_userIdTousers),
                locationName: notification.users_notifications_userIdTousers.locationName
            } : undefined
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
