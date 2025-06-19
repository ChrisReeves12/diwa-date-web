import prisma from "@/lib/prisma";
import { User, UserPhoto } from "@/types";
import { getPublicUserDetails } from "./user.helpers";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import { humanizeTimeDiff } from "./time.helpers";

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