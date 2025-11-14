import { prismaRead, prismaWrite } from "@/lib/prisma";
import { User, UserPhoto } from "@/types";
import {
    getPublicUserDetails,
    getUser,
    calculateUserAge,
    refreshLastActive,
    canUserMessage
} from "./user.helpers";
import { isUserOnline } from "@/helpers/user.helpers";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import { humanizeTimeDiff } from "./time.helpers";
import { isUserSuspended, isUserBlocked } from "./user.helpers";
import { emitNewMessageNotification, emitMessageRead } from "./notification-emitter.helper";

type DbConversation = {
    matchId: number;
    matchUpdatedAtTimestamp: string;
    matchUpdatedAt: Date;
    matchCreatedAt: Date;
    userId: number;
    displayName: string;
    isUnread: number;
    messageIsTowardsMe: number;
    messageContent?: string;
    gender: string;
    mainPhoto?: string;
    photos?: UserPhoto[];
    hideOnlineStatus: boolean;
    lastActiveAt: Date;
};

export type ConversationMatch = DbConversation & Pick<User, "photos" | "mainPhoto"> & {
    isSubscriptionActive: boolean;
    publicMainPhoto: string | undefined;
    mainPhotoCroppedImageData?: CroppedImageData;
    publicPhotos: UserPhoto[];
    matchCreatedAtHumanized: string;
    isOnline: boolean;
}

/**
 * Get conversation matches for a user.
 * @param userId
 * @returns
 */
export async function getConversationsFromMatches(userId: number): Promise<ConversationMatch[]> {
    const matches = await prismaRead.$queryRaw<DbConversation[]>`
        WITH MatchesWithUserIds AS (
            SELECT
                UM."id",
                UM."updatedAtTimestamp",
                UM."updatedAt",
                UM."createdAt",
                CASE WHEN UM."userId" = ${userId} THEN UM."recipientId" ELSE UM."userId" END AS "otherUserId"
            FROM "userMatches" UM
                INNER JOIN "users" R ON R."id" = UM."recipientId" AND R."suspendedAt" IS NULL
                INNER JOIN "users" U ON U."id" = UM."userId" AND U."suspendedAt" IS NULL
            WHERE (UM."recipientId" = ${userId} OR UM."userId" = ${userId}) AND UM."status" = 'matched'),

        ConversationsWithMessages AS (
            SELECT
                ROW_NUMBER() OVER (PARTITION BY MW."id" ORDER BY M."timestamp" DESC) AS "rowNum",
                MW."id" AS "matchId",
                M."id" AS "messageId",
                M."content" AS "messageContent",
                M."updatedAt" AS "messageUpdatedAt",
                CASE WHEN M."readAt" IS NULL AND M."id" IS NOT NULL THEN 1 ELSE 0 END AS "isUnread",
                CASE WHEN M."userId" = U."id" THEN 1 ELSE 0 END AS "messageIsTowardsMe",
                MW."updatedAtTimestamp" AS "matchUpdatedAtTimestamp",
                MW."updatedAt" AS "matchUpdatedAt",
                MW."createdAt" AS "matchCreatedAt",
                U."id" AS "userId",
                U."displayName",
                U."gender",
                U."mainPhoto",
                U."photos",
                U."hideOnlineStatus",
                U."lastActiveAt"
            FROM MatchesWithUserIds MW
                INNER JOIN "users" U ON U."id" = MW."otherUserId" AND U."suspendedAt" IS NULL
                LEFT JOIN "messages" M ON M."matchId" = MW."id")

        SELECT * FROM ConversationsWithMessages WHERE "rowNum" = 1 ORDER BY "matchUpdatedAtTimestamp" DESC`;

    return matches.map((matchUser) => {
        const publicUserDetails = Object.assign(
            {
                matchCreatedAtHumanized: humanizeTimeDiff(matchUser.matchCreatedAt),
                isOnline: isUserOnline(matchUser.lastActiveAt, matchUser.hideOnlineStatus)
            },
            getPublicUserDetails(matchUser));

        return Object.assign({}, matchUser, publicUserDetails);
    });
}

/**
 * Sends a message from one user to another.
 *
 * @param message The message content.
 * @param userId The ID of the user sending the message.
 * @param recipientId The ID of the user receiving the message.
 * @param matchId The ID of the match.
 * @returns Structured response with error handling
 */
export async function sendMessage(
    message: string,
    userId: number,
    recipientId: number,
    matchId: number
): Promise<{ error?: string; statusCode: number; data?: any }> {
    if (await isUserSuspended(recipientId)) {
        return {
            error: 'You cannot send a message to this user because they have been suspended.',
            statusCode: 400
        };
    }

    if (await isUserBlocked(recipientId, userId)) {
        return {
            error: 'You have been blocked by this user.',
            statusCode: 403
        };
    }
    else if (await isUserBlocked(userId, recipientId)) {
        return {
            error: 'You cannot message a user you have blocked.',
            statusCode: 403
        };
    }

    // Check if sender can message the recipient based on premium status
    const permissionResult = await canUserMessage(userId, recipientId);
    if (!permissionResult.canSend) {
        return {
            error: permissionResult.errorMessage || 'You cannot message this user.',
            statusCode: 403
        };
    }

    try {
        const result = await prismaWrite.$transaction(async (tx) => {
            const now = new Date();
            const timestamp = Date.now();

            const messageResult = await tx.messages.create({
                data: {
                    content: message,
                    userId: userId,
                    recipientId: recipientId,
                    matchId: matchId,
                    timestamp: timestamp,
                    createdAt: now,
                    updatedAt: now,
                }
            });

            await tx.userMatches.update({
                where: {
                    id: matchId,
                },
                data: {
                    updatedAtTimestamp: timestamp,
                },
            });

            return messageResult;
        });

        // Send real-time message notification to the recipient
        try {
            const senderUser = await getUser(userId);
            if (senderUser) {
                refreshLastActive(senderUser).then().catch(console.error);
                await emitNewMessageNotification(recipientId, {
                    id: String(result.id),
                    matchId: String(matchId),
                    content: message,
                    userId: String(userId),
                    displayName: senderUser.displayName,
                    userGender: senderUser.gender,
                    publicMainPhoto: senderUser.publicMainPhoto,
                    mainPhotoCroppedImageData: senderUser.mainPhotoCroppedImageData,
                    age: calculateUserAge(senderUser),
                    timestamp: Number(result.timestamp),
                    createdAt: result.createdAt || new Date()
                });
            }
        } catch (wsError) {
            console.error('Failed to emit message notification:', wsError);
        }

        return { statusCode: 200, data: result };
    } catch (error) {
        return {
            error: 'Failed to send message. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Get all messages for a specific match between two users.
 *
 * @param matchId The ID of the match.
 * @param userId The ID of the current user (for validation).
 * @param options Pagination options
 * @returns Array of messages with sender information
 */
export async function getMessagesForMatch(
    matchId: number,
    userId: number,
    options: {
        limit?: number;
        cursor?: number;
        direction?: 'before' | 'after';
    } = {}
): Promise<{ error?: string; statusCode: number; data?: any[] }> {
    try {
        const pageSize = 20;
        const { limit = pageSize, cursor, direction = 'before' } = options;

        // First verify that the user is part of this match
        const match = await prismaRead.userMatches.findFirst({
            where: {
                id: matchId,
                OR: [
                    { userId: userId },
                    { recipientId: userId }
                ],
                status: 'matched'
            }
        });

        if (!match) {
            return {
                error: 'Match not found or you do not have access to this conversation.',
                statusCode: 404
            };
        }

        // Base query conditions
        const where: any = {
            matchId: matchId,
            users: {
                suspendedAt: null
            }
        };

        // Add cursor-based pagination logic
        if (cursor) {
            if (direction === 'before') {
                where.id = { lt: cursor };
            } else {
                where.id = { gt: cursor };
            }
        }

        // Get all messages for this match with sender information, excluding blocked/suspended users
        const messages = await prismaRead.messages.findMany({
            where,
            include: {
                users: true
            },
            orderBy: {
                timestamp: direction === 'before' ? 'desc' : 'asc'
            },
            take: limit
        });

        // Reverse the order if we fetched older messages to maintain ascending order
        if (direction === 'before') {
            messages.reverse();
        }

        // Get unique users from messages and cache their profile details
        const uniqueUsers = new Map();
        for (const message of messages) {
            if (!uniqueUsers.has(message.users.id)) {
                uniqueUsers.set(message.users.id, message.users);
            }
        }

        // Cache profile details for each unique user (avoid redundant DB calls)
        const userProfileCache = new Map();
        for (const [userIdKey, user] of uniqueUsers) {
            const publicUserDetail = getPublicUserDetails(user);
            userProfileCache.set(userIdKey, publicUserDetail);
        }

        // Transform messages to include detailed public user information
        const transformedMessages = [];
        for (const message of messages) {
            const senderProfileDetail = userProfileCache.get(message.users.id);

            transformedMessages.push({
                id: message.id,
                content: message.content,
                userId: message.userId,
                recipientId: message.recipientId,
                timestamp: message.timestamp,
                createdAt: message.createdAt,
                readAt: message.readAt,
                sender: {
                    id: message.users.id,
                    displayName: message.users.displayName,
                    gender: message.users.gender,
                    lastActiveAt: message.users.lastActiveAt,
                    mainPhoto: message.users.mainPhoto,
                    photos: message.users.photos,
                    profileDetail: senderProfileDetail
                },
                isFromCurrentUser: message.userId === userId
            });
        }

        return { statusCode: 200, data: transformedMessages };
    } catch (error) {
        console.error('Error fetching messages for match:', error);
        return {
            error: 'Failed to fetch messages. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Get match details including the other user's information for the chat header.
 *
 * @param matchId The ID of the match.
 * @param currentUserId The ID of the current user.
 * @returns Match details with the other user's profile information
 */
export async function getMatchDetails(
    matchId: number,
    currentUserId: number
): Promise<{ error?: string; statusCode: number; data?: any }> {
    try {
        // Get the match and other user details
        const match = await prismaRead.userMatches.findFirst({
            where: {
                id: matchId,
                OR: [
                    { userId: currentUserId },
                    { recipientId: currentUserId }
                ],
                status: 'matched'
            },
            include: {
                users_userMatches_userIdTousers: true,
                users_userMatches_recipientIdTousers: true
            }
        });

        if (!match) {
            return {
                error: 'Match not found or you do not have access to this conversation.',
                statusCode: 404
            };
        }

        // Determine which user is the "other" user (not the current user)
        const otherUser = (match.userId === currentUserId
            ? await getUser(match.recipientId)
            : await getUser(match.userId));

        // Check if the other user is suspended
        if (otherUser?.suspendedAt) {
            return {
                error: 'Other user has been suspended.',
                statusCode: 404
            };
        }

        if (!otherUser) {
            return {
                error: 'Other user not found or has been suspended.',
                statusCode: 404
            };
        }

        // Check if current user can message the other user based on premium status
        const permissionResult = await canUserMessage(currentUserId, otherUser.id);
        if (!permissionResult.canSend) {
            return {
                error: permissionResult.errorMessage || 'You cannot message this user.',
                statusCode: 418
            };
        }

        // Get detailed profile information for the other user
        const otherUserPublicDetail = getPublicUserDetails(otherUser);

        return {
            statusCode: 200,
            data: {
                matchId: match.id,
                matchStatus: match.status,
                matchCreatedAt: match.createdAt,
                matchUpdatedAt: match.updatedAt,
                otherUser: {
                    id: otherUser.id,
                    displayName: otherUser.displayName,
                    gender: otherUser.gender,
                    lastActiveAt: otherUser.lastActiveAt,
                    hideOnlineStatus: otherUser.hideOnlineStatus,
                    mainPhoto: otherUser.mainPhoto,
                    ...otherUserPublicDetail
                }
            }
        };
    } catch (error) {
        console.error('Error fetching match details:', error);
        return {
            error: 'Failed to fetch match details. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Mark all unread messages in a match as read for the current user.
 *
 * @param matchId The ID of the match.
 * @param userId The ID of the current user.
 * @returns Success status
 */
export async function markMessagesAsRead(
    matchId: number,
    userId: number
): Promise<{ error?: string; statusCode: number; data?: any }> {
    try {
        // First verify that the user is part of this match
        const match = await prismaRead.userMatches.findFirst({
            where: {
                id: matchId,
                OR: [
                    { userId: userId },
                    { recipientId: userId }
                ],
                status: 'matched'
            }
        });

        if (!match) {
            return {
                error: 'Match not found or you do not have access to this conversation.',
                statusCode: 404
            };
        }

        const now = new Date();

        // Get the other user's ID from the match
        const otherUserId = match.userId === userId ? match.recipientId : match.userId;

        // Mark all unread messages in this match as read for the current user
        // Only mark messages where the current user is the recipient and readAt is null
        const updateResult = await prismaWrite.messages.updateMany({
            where: {
                matchId: matchId,
                recipientId: userId,
                readAt: null
            },
            data: {
                readAt: now,
                updatedAt: now
            }
        });

        // Get the latest message to emit read status
        if (updateResult.count > 0) {
            const readingUser = await getUser(userId);
            if (readingUser) {
                refreshLastActive(readingUser).then().catch(console.error);
            }

            const latestMessage = await prismaRead.messages.findFirst({
                where: {
                    matchId: matchId,
                    recipientId: userId
                },
                orderBy: {
                    id: 'desc'
                }
            });

            if (latestMessage) {
                // Emit read status to the sender
                await emitMessageRead(otherUserId, {
                    messageId: String(latestMessage.id),
                    conversationId: String(matchId),
                    readBy: String(userId),
                    timestamp: now
                });
            }
        }

        return {
            statusCode: 200,
            data: {
                messagesMarkedAsRead: updateResult.count
            }
        };
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return {
            error: 'Failed to mark messages as read. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Acknowledge matches as read.
 * @param currentUserId
 * @param conversations
 */
export async function markMatchesAsRead(currentUserId: number, conversations: { matchId: number }[]) {
    const matchIds = conversations.map(conversation => conversation.matchId);
    const updateResult = await prismaWrite.userMatches.updateMany({
        where: {
            id: {
                in: matchIds
            },
            acknowledgedAt: null
        },
        data: {
            acknowledgedAt: new Date()
        }
    });

    // Remove notifications
    await prismaWrite.$queryRaw`DELETE FROM "notifications" 
        WHERE (data #>> '{matchId}')::integer = ANY (${matchIds}) AND "recipientId" = ${currentUserId}`;

    return updateResult;
}
