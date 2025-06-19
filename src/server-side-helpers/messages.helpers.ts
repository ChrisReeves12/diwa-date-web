import prisma from "@/lib/prisma";
import { User, UserPhoto } from "@/types";
import { getPublicUserDetails } from "./user.helpers";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import { humanizeTimeDiff } from "./time.helpers";
import { isUserSuspended, isUserBlocked } from "./user.helpers";

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
};

export type ConversationMatch = DbConversation & Pick<User, "photos" | "mainPhoto"> & {
    isSubscriptionActive: boolean;
    publicMainPhoto: string | undefined;
    mainPhotoCroppedImageData?: CroppedImageData;
    publicPhotos: UserPhoto[];
    matchCreatedAtHumanized: string;
}

/**
 * Get conversation matches for user.
 * @param userId
 * @returns 
 */
export async function getConversationsFromMatches(userId: number): Promise<ConversationMatch[]> {
    const matches = await prisma.$queryRaw<DbConversation[]>`
        WITH MatchesWithUserIds AS (
            SELECT
                UM."id",
                UM."updatedAtTimestamp",
                UM."updatedAt",
                UM."createdAt",
                CASE WHEN UM."userId" = ${userId} THEN UM."recipientId" ELSE UM."userId" END AS "otherUserId"
            FROM "userMatches" UM
                INNER JOIN "users" R ON R."id" = UM."recipientId"
                INNER JOIN "users" U ON U."id" = UM."userId"
            WHERE (UM."recipientId" = ${userId} OR UM."userId" = ${userId}) AND UM."status" = 'matched'
            ORDER BY UM."updatedAtTimestamp" DESC
            LIMIT 150),

        ConversationsWithMessages AS (
            SELECT
                ROW_NUMBER() OVER (PARTITION BY MW."id" ORDER BY M."updatedAt" DESC) AS "rowNum",
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
                U."mainPhoto",
                U."photos"
            FROM MatchesWithUserIds MW
                INNER JOIN "users" U ON U."id" = MW."otherUserId"
                LEFT JOIN "messages" M ON M."matchId" = MW."id")

        SELECT * FROM ConversationsWithMessages WHERE "rowNum" = 1`;

    return matches.map((matchUser) => {
        const publicUserDetails = Object.assign(
            { matchCreatedAtHumanized: humanizeTimeDiff(matchUser.matchCreatedAt) },
            getPublicUserDetails(matchUser));

        return Object.assign({}, matchUser, publicUserDetails);
    });
};

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
    // Check if recipient is suspended
    if (await isUserSuspended(recipientId)) {
        return {
            error: 'You cannot send a message to this user because they have been suspended.',
            statusCode: 400
        };
    }

    // Check if sender is blocked by recipient
    if (await isUserBlocked(recipientId, userId)) {
        return {
            error: 'You have been blocked by this user.',
            statusCode: 403
        };
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
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

        return { statusCode: 200, data: result };
    } catch (error) {
        return {
            error: 'Failed to send message. Please try again later.',
            statusCode: 500
        };
    }
}