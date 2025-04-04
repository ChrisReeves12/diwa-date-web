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
import { NotificationPendingMatch, NotificationReceivedMessage, Notification } from '@/types/notification-response.interface';
import { transformBigInts } from '@/util';

/**
 * Get pending matches for a user
 * @param user
 * @returns
 */
export async function getPendingMatches(user: User): Promise<NotificationPendingMatch[]> {

    // Get pending matches where the current user is the recipient
    const pendingMatches = await prisma.user_matches.findMany({
        where: {
            recipient_id: user.id,
            status: 'pending'
        },
        orderBy: {
            created_at: 'desc'
        },
        take: 5,
        include: {
            sender: {
                select: {
                    id: true,
                    display_name: true,
                    main_photo: true,
                    location_name: true,
                    country: true,
                    photos: true,
                    gender: true,
                    date_of_birth: true,
                    last_active_at: true
                }
            }
        }
    });

    const mutedUsersPromise = prisma.muted_users.findMany({
        select: {
            recipient_id: true
        },
        where: {
            user_id: user.id,
            recipient_id: {
                in: pendingMatches.map(pm => pm.user_id)
            }
        }
    });

    const blockedUsersPromise = prisma.blocked_users.findMany({
        select: {
            blocked_user_id: true
        },
        where: {
            user_id: user.id,
            blocked_user_id: {
                in: pendingMatches.map(pm => pm.user_id)
            }
        }
    });

    const [mutedUsers, blockedUsers] = await Promise.all([
        mutedUsersPromise,
        blockedUsersPromise
    ]);

    // Filter out muted and blocked users
    const finalPendingMatches = _.reject(pendingMatches, pm =>
        _.some(mutedUsers, mu => mu.recipient_id === pm.user_id) ||
        _.some(blockedUsers, bu => bu.blocked_user_id === pm.user_id)
    );

    return finalPendingMatches.map((pm) => {
        (pm.sender as unknown) = prepareUser(pm.sender as unknown as User);
        delete (pm.sender as any).date_of_birth;
        delete (pm.sender as any).password;
        return transformBigInts(pm);
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
                       U.display_name,
                       U.main_photo,
                       U.photos,
                       U.date_of_birth,
                       U.last_active_at,
                       U.suspended_at,
                       U.location_name,
                       U.gender AS user_gender,
                       LEAST(COUNT(M.id) OVER (PARTITION BY M.user_id), 100) AS msg_count,
                       IF(MAX(M.timestamp) OVER (PARTITION BY M.user_id) = M.timestamp, 1, 0) AS is_latest
                    FROM messages M
                        JOIN users U ON M.user_id = U.id AND M.user_id NOT IN (SELECT blocked_user_id FROM blocked_users _BU WHERE _BU.user_id = ${user.id})
                    WHERE M.recipient_id = ${user.id}
                        ) S
        WHERE S.is_latest = 1
        ORDER BY S.timestamp DESC LIMIT 5
    `;

    return (results as NotificationReceivedMessage[]).map(m => {
        const retVal = transformBigInts({
            ...m,
            ...{
                photos: Array.isArray(m.photos) ? m.photos.map(p => appendMediaRootToImage(p)) : [],
                public_main_photo: m.main_photo ? appendMediaRootToImageUrl(m.main_photo) : undefined,
                main_photo_cropped_image_data: getMainCroppedImageData(m),
                msg_count: Number(m.msg_count),
                age: calculateUserAge({ date_of_birth: (m as any).date_of_birth })
            }
        });

        delete (retVal as any).date_of_birth;

        return retVal as NotificationReceivedMessage;
    });
}

/**
 * Count all pending matches received by the user, excluding those from muted or blocked users.
 * @param user The recipient user.
 * @returns A promise that resolves to the total count of pending matches after filtering.
 */
export async function countAllPendingMatches(user: User): Promise<number> {
    const mutedUsersPromise = prisma.muted_users.findMany({
        select: { recipient_id: true },
        where: { user_id: user.id }
    });

    const blockedUsersPromise = prisma.blocked_users.findMany({
        select: { blocked_user_id: true },
        where: { user_id: user.id }
    });

    const [mutedUsers, blockedUsers] = await Promise.all([
        mutedUsersPromise,
        blockedUsersPromise
    ]);

    const excludedUserIds = [
        ...mutedUsers.map(mu => mu.recipient_id),
        ...blockedUsers.map(bu => bu.blocked_user_id)
    ];

    return prisma.user_matches.count({
        where: {
            recipient_id: user.id,
            status: 'pending',
            user_id: {
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
    const result = await prisma.$queryRaw<{ total_count: bigint }[]>`
        SELECT COUNT(DISTINCT M.user_id) as total_count
        FROM messages M
        WHERE M.recipient_id = ${user.id}
          AND M.user_id NOT IN (SELECT blocked_user_id FROM blocked_users _BU WHERE _BU.user_id = ${user.id})
    `;

    if (result && result.length > 0 && result[0].total_count !== undefined) {
        return Number(result[0].total_count);
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
            recipient_id: user.id,
            read_at: null
        },
        include: {
            sender: {
                select: {
                    id: true,
                    display_name: true,
                    main_photo: true,
                    location_name: true,
                    country: true,
                    photos: true,
                    gender: true,
                    date_of_birth: true,
                    last_active_at: true
                }
            },
        },
        orderBy: {
            created_at: 'desc'
        },
        take: 5
    });

    return notifications.map(notification => {
        (notification.sender as unknown) = prepareUser(notification.sender as unknown as User);
        delete (notification.sender as any).date_of_birth;
        return transformBigInts(notification);
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
            recipient_id: user.id,
            read_at: null
        }
    });
}
