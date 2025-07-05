import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User, AuthResult, UserPhoto, UserPreview, SubscriptionPlanEnrollment } from '../types';
import moment from "moment";
import _ from "lodash";
import {
    createSession,
    getSessionData,
    getSessionId,
    deleteSession
} from './session.helpers';
import { businessConfig } from "@/config/business";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { logError } from "@/server-side-helpers/logging.helpers";
import { LikesSortBy } from "@/types/likes-sort-by.enum";
import pgDbPool from "@/lib/postgres";
import { humanizeTimeDiff } from "@/server-side-helpers/time.helpers";
import { UserProfileDetail } from '@/types/user-profile-detail.interface';
import {
    emitNewMatchNotification,
    emitNewNotification,
    emitMatchCancelled,
    emitUserBlocked,
    emitUserUnblocked
} from '@/server-side-helpers/notification-emitter.helper';
import { sendEmail } from './mail.helper';

type UserForProfileDetail = Pick<User,
    | "id"
    | "publicPhotos"
    | "mainPhotoCroppedImageData"
    | "publicMainPhoto"
    | "displayName"
    | "seekingGender"
    | "gender"
    | "age"
    | "maritalStatus"
    | "bio"
    | "locationName"
    | "interests"
    | "wantsChildren"
    | "hasChildren"
    | "education"
    | "smoking"
    | "drinking"
    | "religions"
    | "bodyType"
    | "height"
    | "ethnicities"
    | "lastActiveAt"
    | "hideOnlineStatus"
>

type DbLike = {
    id: number;
    displayName: string;
    gender: string;
    dateOfBirth: Date;
    lastActiveAt: Date;
    photos?: UserPhoto[];
    numOfPhotos: number;
    mainPhoto?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    country: string;
    createdAt: Date;
    matchId: number;
    matchStatus: string;
    receivedLikeAt: Date;
    age: number;
};

/**
 * Get a user by their ID
 * @param id The user's ID
 * @returns The user object without the password or null if not found
 */
export async function getUser(id: number): Promise<User | null> {
    const user = await prisma.users.findUnique({
        where: {
            id: id
        }
    });

    if (!user) {
        return null;
    }

    user.password = '';
    (user as any).age = calculateUserAge(user);

    return user as unknown as User;
}

/**
 * Block a user
 * @param userId The ID of the user doing the blocking
 * @param blockedUserId The ID of the user being blocked
 * @returns True if the operation was successful
 */
export async function blockUser(userId: number, blockedUserId: number) {
    // Check if already blocked
    const existingBlock = await prisma.blockedUsers.findFirst({
        where: {
            userId: userId,
            blockedUserId: blockedUserId
        }
    });

    if (existingBlock) {
        return true; // Already blocked
    }

    // Create new block record
    const blockTimestamp = new Date();
    await prisma.blockedUsers.create({
        data: {
            userId: userId,
            blockedUserId: blockedUserId
        }
    });

    // Emit WebSocket event to the blocked user
    try {
        await emitUserBlocked(String(blockedUserId), {
            blockedUserId: blockedUserId,
            blockedBy: userId,
            timestamp: blockTimestamp
        });
    } catch (wsError) {
        console.error('Failed to emit user blocked notification:', wsError);
    }

    return true;
}

/**
 * Unblock a user
 * @param userId The ID of the user doing the unblocking
 * @param blockedUserId The ID of the user being unblocked
 * @returns True if the operation was successful
 */
export async function unBlockUser(userId: number, blockedUserId: number) {
    // Delete block record if exists
    await prisma.blockedUsers.deleteMany({
        where: {
            userId: userId,
            blockedUserId: blockedUserId
        }
    });

    // Emit WebSocket event to the unblocked user
    try {
        await emitUserUnblocked(String(blockedUserId), {
            unblockedUserId: blockedUserId,
            unblockedBy: userId,
            timestamp: new Date()
        });
    } catch (wsError) {
        console.error('Failed to emit user unblocked notification:', wsError);
    }

    return true;
}

/**
 * Refresh the last active on the user.
 * @param user
 */
export async function refreshLastActive(user: User) {
    try {
        await Promise.all([
            prisma.users.update({
                where: { id: user.id },
                data: { lastActiveAt: new Date() }
            }),
            // updateUserSearchDocument(Number(user.id), {doc: {last_active_at: new Date()}})
        ]);
    } catch (error: any) {
        logError(error);
    }
}

/**
 * Get user profile detail.
 * @param currentUserId
 * @param user
 */
export async function getUserProfileDetail(currentUserId: number, user: UserForProfileDetail) {
    const { rows: profileDetailResults } = await pgDbPool.query(`
                WITH "TheyBlockedMeIds" AS (SELECT "BU"."userId"
                                            FROM "blockedUsers" "BU"
                                            WHERE "BU"."blockedUserId" = $1),
                     "IBlockedThemIds" AS (SELECT "BU"."blockedUserId"
                                           FROM "blockedUsers" "BU"
                                           WHERE "BU"."userId" = $2),
                     "IMutedThemIds" AS (SELECT "MU"."recipientId"
                                         FROM "mutedUsers" "MU"
                                         WHERE "MU"."userId" = $3),
                     "MyMatches" AS (SELECT "M".*
                                     FROM "userMatches" "M"
                                     WHERE ("M"."recipientId" = $4 OR "M"."userId" = $5)
                                       AND "M"."recipientId" NOT IN (SELECT "userId" FROM "TheyBlockedMeIds")
                                       AND "M"."userId" NOT IN (SELECT "recipientId" FROM "IMutedThemIds"))

                SELECT EXISTS(SELECT 1 FROM "TheyBlockedMeIds" WHERE "userId" = $6)             AS "theyBlockedMe",
                       EXISTS(SELECT 1 FROM "IBlockedThemIds" WHERE "blockedUserId" = $7)      AS "blockedThem",
                       (SELECT "status" FROM "MyMatches" WHERE "recipientId" = $8 OR "userId" = $9) AS "matchStatus",
                       (SELECT "id" FROM "MyMatches" WHERE "recipientId" = $10 OR "userId" = $11)     AS "matchId",
                       EXISTS(SELECT 1 FROM "MyMatches" WHERE "userId" = $12)                    AS "matchIsTowardsMe"`,
        [
            currentUserId,
            currentUserId,
            currentUserId,
            currentUserId,
            currentUserId,
            user.id,
            user.id,
            user.id,
            user.id,
            user.id,
            user.id,
            user.id
        ]);

    const additionalProfileDetails = _.first(profileDetailResults) as
        {
            theyBlockedMe: boolean,
            blockedThem: boolean,
            matchStatus?: string,
            matchId?: number,
            matchIsTowardsMe: boolean
        };

    return {
        user,
        seekingLabel: user.seekingGender ? createGenderLabels(user.seekingGender) : 'Not specified',
        maritalStatusLabel: user.maritalStatus ?
            businessConfig.options.maritalStatuses[user.maritalStatus as keyof typeof businessConfig.options.maritalStatuses] : 'No Answer',
        interestLabels: (user.interests || [])
            .map((interest) => businessConfig.options.interests[interest as keyof typeof businessConfig.options.interests]),
        wantsChildrenLabel: user.wantsChildren ?
            businessConfig.options.wantsChildrenStatuses[user.wantsChildren as keyof typeof businessConfig.options.wantsChildrenStatuses] : 'No Answer',
        hasChildrenLabel: user.hasChildren ?
            businessConfig.options.hasChildrenStatuses[user.hasChildren as keyof typeof businessConfig.options.hasChildrenStatuses] : 'No Answer',
        educationLabel: user.education ?
            businessConfig.options.educationLevels[user.education as keyof typeof businessConfig.options.educationLevels] : 'No Answer',
        smokingLabel: user.smoking ?
            businessConfig.options.smokingStatuses[user.smoking as keyof typeof businessConfig.options.smokingStatuses] : 'No Answer',
        drinkingLabel: user.drinking ?
            businessConfig.options.drinkingStatuses[user.drinking as keyof typeof businessConfig.options.drinkingStatuses] : 'No Answer',
        religionLabel: (user.religions || []).map((religion) => businessConfig.options.religions[religion as keyof typeof businessConfig.options.religions]).join(', '),
        bodyTypeLabel: user.bodyType ?
            businessConfig.options.bodyTypes[user.bodyType as keyof typeof businessConfig.options.bodyTypes] : 'No Answer',
        heightLabel: user.height ? businessConfig.options.height[user.height as keyof typeof businessConfig.options.height] : 'No Answer',
        ethnicityLabel: (user.ethnicities || []).map(ethnicity =>
            businessConfig.options.ethnicities[ethnicity as keyof typeof businessConfig.options.ethnicities] || ethnicity).join(', '),
        matchAcceptedAt: '',
        lastActiveHumanized: humanizeTimeDiff(user.lastActiveAt),
        ...additionalProfileDetails
    };
}

import { createGenderLabels } from '@/helpers/user.helpers';
import { generateCryptoRandomString } from "@/util";
import { NextResponse } from 'next/server';

/**
 * Authenticate a user with email and password
 * @param email The user's email
 * @param password The user's password
 * @param response Optional NextResponse to set the session cookie on
 * @returns Authentication result with user data if successful
 */
export async function authenticateUser(
    email: string,
    password: string,
    response?: NextResponse
): Promise<AuthResult> {
    const user = await prisma.users.findUnique({
        where: {
            email
        }
    });

    if (!user) {
        return {
            success: false,
            message: 'The email and/or password does not match our records.'
        };
    }

    // Verify password
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
        return {
            success: false,
            message: 'The email and/or password does not match our records.'
        };
    }

    await refreshLastActive(user as unknown as User);

    // Create a session for the user
    const sessionId = await createSession(
        user as unknown as User,
        response
    );

    return {
        success: true,
        sessionId
    };
}

/**
 * Returns the currently logged-in user.
 * @param cookieStore
 */
export async function getCurrentUser(cookieStore: ReadonlyRequestCookies) {
    const sessionId = await getSessionId(cookieStore);

    if (!sessionId) {
        return undefined;
    }

    // Get session data from Redis
    const sessionData = await getSessionData(sessionId);

    if (!sessionData) {
        return undefined;
    }

    // Get the user from the database
    const result = await prisma.users.findUnique({
        where: {
            id: typeof sessionData.userId === 'string' ? Number(sessionData.userId) : sessionData.userId,
            suspendedAt: null
        },
        include: {
            subscriptionPlanEnrollments: {
                include: {
                    subscriptionPlans: true
                },
                take: 1
            }
        }
    });

    if (!result) {
        return undefined;
    }

    const user = result as unknown as User;
    const enhancedUser = Object.assign({}, user, getPublicUserDetails(user));

    return enhancedUser;
}

/**
 * Validate email for user
 * @param token
 * @param currentUserId 
 * @returns 
 */
export async function verifyUserEmail(token: string, currentUserId: number) {
    const { rows: users } = await pgDbPool.query(
        `SELECT * FROM users WHERE "emailVerificationToken" = $1 AND "emailVerificationTokenExpiry" > NOW() LIMIT 1`,
        [token]
    );

    const user = users[0];

    if (!user || (currentUserId !== user.id)) {
        return { error: 'Unauthorized', status: 401 };
    }

    await pgDbPool.query(
        `UPDATE users 
         SET "emailVerifiedAt" = NOW(),
             "emailVerificationToken" = NULL,
             "emailVerificationTokenExpiry" = NULL
         WHERE id = $1`,
        [user.id]
    );

    return { status: 200 };
}

/**
 * Appends the appropriate media root URL to an image path based on its source
 *
 * @param image
 * @returns The complete URL to the image
 */
export function appendMediaRootToImage(image: UserPhoto) {
    const lImage = _.cloneDeep(image);
    lImage.path = appendMediaRootToImageUrl(lImage.path) || lImage.path;
    if (lImage.croppedImageData?.croppedImagePath) {
        lImage.croppedImageData.croppedImagePath = appendMediaRootToImageUrl(lImage.croppedImageData.croppedImagePath)
            || lImage.croppedImageData.croppedImagePath;
    }

    return lImage;
}

/**
 * Appends the appropriate media root URL to an image URL.
 *
 * @param imageUrl
 * @returns
 */
export function appendMediaRootToImageUrl(imageUrl?: string) {
    if (!imageUrl)
        return imageUrl;

    const mediaRoot = imageUrl.startsWith('random') ? process.env.FAKER_MEDIA_IMAGE_ROOT_URL : process.env.MEDIA_IMAGE_ROOT_URL;

    return `${mediaRoot}/${imageUrl}`;
}

/**
 * Checks if the subscription for a given user is currently active.
 *
 * @param {User} user - The user object whose subscription status is being checked.
 * @return {boolean} Returns true if the user's subscription is active, false otherwise.
 */
export function checkSubscriptionActive(user: { subscriptionPlanEnrollments?: SubscriptionPlanEnrollment[] }): boolean {
    if (!user.subscriptionPlanEnrollments) {
        return false;
    }

    const subscription = _.first(user.subscriptionPlanEnrollments);
    if (!subscription) {
        return false;
    }

    return (!subscription.endsAt || moment(subscription.endsAt).startOf('day').isAfter(moment().startOf('day')));
}

/**
 * Check if a user with the given email already exists
 * @param email The email to check
 * @returns True if a user with this email exists, false otherwise
 */
export async function checkUserExists(email: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
        where: {
            email: email.toLowerCase()
        }
    });

    return !!user; // Convert to boolean
}

/**
 * Update user account with correct
 * @param userId
 * @param newEmail
 */
export async function generateEmailUpdateUrl(userId: number, newEmail: string) {
    const token = generateCryptoRandomString(32);
    await pgDbPool.query(`UPDATE "users" SET "resetToken" = $1, 
                                             "resetTokenExpiry" = NOW() + INTERVAL '20 minutes', 
                                             "newDesiredEmail" = $2,
                                             "updatedAt" = NOW() WHERE id = $3`, [token, newEmail.toLowerCase(), userId]);

    return `${process.env.APP_URL_ROOT}/user/reset/email?token=${token}`;
}

/**
 * Update the user's email.
 * @param userId
 * @param newEmail
 */
export async function updateUserEmail(userId: number, newEmail: string) {
    await pgDbPool.query(`
        UPDATE "users" 
        SET "email" = $1,
            "newDesiredEmail" = NULL,
            "resetToken" = NULL, 
            "resetTokenExpiry" = NULL,
            "updatedAt" = NOW()
        WHERE id = $2
    `, [newEmail.toLowerCase(), userId]);
}

/**
 * Hashes a password.
 * @param clearTextPassword
 */
export async function hashPassword(clearTextPassword: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(process.env.APP_KEY + clearTextPassword, salt);
}

/**
 * Compares the clear text and password hash for authentication.
 * @param clearTextPassword
 * @param passwordHash
 * @returns
 */
export async function comparePasswords(clearTextPassword: string, passwordHash: string): Promise<boolean> {
    return await bcrypt.compare(process.env.APP_KEY + clearTextPassword, passwordHash);
}

/**
 * Log out a user by deleting their session
 * @param cookieStore
 * @returns True if logout was successful, false otherwise
 */
export async function logoutUser(cookieStore: ReadonlyRequestCookies): Promise<void> {

    const sessionId = await getSessionId(cookieStore);
    if (!sessionId) {
        return;
    }

    await deleteSession(sessionId);
}

/**
 * Calculate a user's age
 * @param { dateOfBirth }
 * @returns number
 */
export function calculateUserAge({ dateOfBirth }: { dateOfBirth: Date | string }) {
    const curDate = new Date();
    const lDateOfBirth = typeof dateOfBirth === 'string' ? moment(dateOfBirth).toDate() : dateOfBirth;

    let age = curDate.getFullYear() - lDateOfBirth.getFullYear();

    // Adjust age if birthday hasn't occurred yet this year
    const birthMonth = lDateOfBirth.getMonth();
    const birthDay = lDateOfBirth.getDate();
    const currentMonth = curDate.getMonth();
    const currentDay = curDate.getDate();

    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
        age--;
    }

    return age;
}

/**
 * Get cropped image data of main photo.
 * @param data
 * @returns
 */
export function getMainCroppedImageData(data: Pick<User, 'photos' | 'mainPhoto'>) {
    if (!data.photos) {
        return undefined;
    }

    const mainPhotoName = data.mainPhoto;
    const mainPhoto = data.photos.find(p => p.path.endsWith(mainPhotoName as string));
    if (mainPhoto?.croppedImageData?.croppedImagePath) {
        mainPhoto.croppedImageData.croppedImagePath = appendMediaRootToImageUrl(mainPhoto.croppedImageData.croppedImagePath) ||
            mainPhoto.croppedImageData.croppedImagePath;
    }

    return mainPhoto ? mainPhoto.croppedImageData : undefined;
}

/**
 * Get public user details.
 * @param user The user object
 * @returns An object containing public user details
 */
export function getPublicUserDetails(user: Pick<User, "mainPhoto" | "photos"> & { subscriptionPlanEnrollments?: SubscriptionPlanEnrollment[] }) {
    const isSubscriptionActive = checkSubscriptionActive(user);

    return {
        isSubscriptionActive,
        publicMainPhoto: user.mainPhoto && user.photos ? appendMediaRootToImageUrl(user.mainPhoto) : undefined,
        mainPhotoCroppedImageData: user.mainPhoto && user.photos ?
            getMainCroppedImageData({ photos: user.photos, mainPhoto: user.mainPhoto }) : undefined,
        publicPhotos: user.photos?.length ?
            user.photos.map((p: any) => appendMediaRootToImage(p)) : []
    };
}

/**
 * Checks if a user is suspended
 * @param userId
 */
export async function isUserSuspended(userId: number) {
    const result = await pgDbPool.query(`SELECT ("suspendedAt" IS NOT NULL) AS "isSuspended"
                                               FROM users
                                               WHERE id = $1`, [userId]);

    return _.get(result.rows, [0, 'isSuspended']);
}

/**
 * Find a user by reset Token.
 * @param resetToken
 */
export async function findUserByResetToken(resetToken: string) {
    const result = await pgDbPool.query<Pick<User, "id" | "newDesiredEmail" | "password">>(`SELECT id, "newDesiredEmail", "password" FROM "users" WHERE "resetToken" = $1 
                        AND "resetTokenExpiry" IS NOT NULL AND "resetTokenExpiry" > NOW() LIMIT 1`, [resetToken]);

    if (result.rows.length > 0) {
        return result.rows[0];
    }
}

/**
 * Suspends or unsuspends a user
 * @param userId The ID of the user to suspend or unsuspend
 * @param suspend If true, suspends the user; if false, unsuspends the user
 * @returns True if the operation was successful, false otherwise
 */
export async function suspendUser(userId: number, suspend: boolean = true): Promise<boolean> {
    try {
        const suspendedAtValue = suspend ? new Date() : null;

        // Update the user record in the database
        await prisma.users.update({
            where: {
                id: userId
            },
            data: {
                suspendedAt: suspendedAtValue
            }
        });

        return true;
    } catch (error: any) {
        logError(
            new Error(`An error occurred while ${suspend ? 'suspending' : 'unsuspending'} user ${userId}.`),
            String(error)
        );
        return false;
    }
}

/**
 * Send a match request from one user to another
 * @param userId The ID of the user sending the match request
 * @param recipientUserId The ID of the user receiving the match request
 * @param shouldCreateNotification Whether or not the notification should be created
 * @returns The status of the match after the operation ('pending' or 'matched')
 */
export async function sendUserMatchRequest(userId: number, recipientUserId: number, shouldCreateNotification: boolean = true): Promise<'pending' | 'matched' | {
    error: string
}> {
    if (await isUserSuspended(recipientUserId)) {
        return { error: 'You cannot send a like to this user because they have been suspended.' }
    }

    if (await isUserBlocked(recipientUserId, userId)) {
        return { error: 'You have been blocked by this user.' };
    }

    // Check if a match already exists
    const existingMatch = await prisma.userMatches.findFirst({
        where: {
            OR: [
                {
                    userId: userId,
                    recipientId: recipientUserId
                },
                {
                    userId: recipientUserId,
                    recipientId: userId
                }
            ]
        }
    });

    // If there's an existing match where the current user is the recipient,
    // this means the other user already liked them, so we should confirm the match
    if (existingMatch && Number(existingMatch.recipientId) === userId && existingMatch.status === 'pending') {
        await prisma.userMatches.update({
            where: {
                id: existingMatch.id
            },
            data: {
                status: 'matched',
                updatedAtTimestamp: Date.now(),
                updatedAt: new Date()
            }
        });

        // Create a notification for the original match initiator (the user who sent the original match request)
        if (shouldCreateNotification) {
            const notification = await prisma.notifications.create({
                data: {
                    userId: userId, // The user who confirmed the match
                    recipientId: existingMatch.userId, // The user who originally initiated the match
                    type: 'match',
                    data: { matchId: existingMatch.id },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            // Send real-time notification for confirmed match
            try {
                // Get sender info for the notification
                const senderUser = await getUser(userId);
                if (senderUser) {
                    await emitNewNotification(String(existingMatch.userId), {
                        id: notification.id,
                        sender: {
                            id: senderUser.id,
                            locationName: senderUser.locationName || '',
                            gender: senderUser.gender,
                            displayName: senderUser.displayName,
                            age: calculateUserAge(senderUser),
                            publicMainPhoto: senderUser.publicMainPhoto
                        }
                    });
                }
            } catch (wsError) {
                console.error('Failed to emit confirmed match notification:', wsError);
            }
        }

        return 'matched';
    }

    if (existingMatch) {
        return existingMatch.status as 'pending' | 'matched';
    }

    // Create a new match with pending status
    const newMatch = await prisma.userMatches.create({
        data: {
            userId: userId,
            recipientId: recipientUserId,
            status: 'pending',
            updatedAtTimestamp: Date.now(),
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });

    // Send real-time notification for new pending like
    try {
        const senderUser = await getUser(userId);
        if (senderUser) {
            await emitNewMatchNotification(String(recipientUserId), {
                id: newMatch.id,
                sender: {
                    id: senderUser.id,
                    locationName: senderUser.locationName || '',
                    gender: senderUser.gender,
                    displayName: senderUser.displayName,
                    age: calculateUserAge(senderUser),
                    publicMainPhoto: senderUser.publicMainPhoto
                }
            });
        }
    } catch (wsError) {
        console.error('Failed to emit pending like notification:', wsError);
    }

    await prisma.mutedUsers.deleteMany({
        where: {
            userId: recipientUserId,
            recipientId: userId
        }
    });

    return 'pending';
}

/**
 * Remove a match request between two users
 * @param userId The ID of the user removing the match
 * @param recipientUserId The ID of the other user in the match
 */
export async function removeUserMatchRequest(userId: number, recipientUserId: number): Promise<void> {
    // First get the match information before deleting for WebSocket notification
    const existingMatch = await prisma.userMatches.findFirst({
        where: {
            OR: [
                {
                    userId: userId,
                    recipientId: recipientUserId
                },
                {
                    userId: recipientUserId,
                    recipientId: userId
                }
            ]
        }
    });

    // Delete any match between these users
    await prisma.userMatches.deleteMany({
        where: {
            OR: [
                {
                    userId: userId,
                    recipientId: recipientUserId
                },
                {
                    userId: recipientUserId,
                    recipientId: userId
                }
            ]
        }
    });

    // Send WebSocket notification to the other user about match cancellation
    if (existingMatch) {
        try {
            // Determine who the other user is (not the one cancelling)
            const otherUserId = existingMatch.userId === userId ? existingMatch.recipientId : existingMatch.userId;

            await emitMatchCancelled(String(otherUserId), {
                matchId: existingMatch.id,
                cancelledBy: userId
            });
        } catch (wsError) {
            console.error('Failed to emit match cancellation notification:', wsError);
            // Don't throw the error - match removal should still succeed even if WebSocket fails
        }
    }
}

/**
 * Mutes a user by ID.
 * @param userId
 * @param recipientUserId
 * @returns True if the operation was successful
 */
export async function muteUserById(userId: number, recipientUserId: number): Promise<boolean> {
    // Check if there is a mutedUser record by userId and recipientId
    const existingMuted = await prisma.mutedUsers.findFirst({
        where: {
            userId: userId,
            recipientId: recipientUserId
        }
    });

    // If there is no record, insert one
    if (!existingMuted) {
        await prisma.mutedUsers.create({
            data: {
                userId: userId,
                recipientId: recipientUserId,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    }

    return true;
}

/**
 * Get all blocked users for a given user
 * @param userId The ID of the user whose blocked list to retrieve
 * @returns Array of blocked user details
 */
export async function getBlockedUsers(userId: number): Promise<UserPreview[]> {
    const results = await pgDbPool.query(`
        SELECT 
            U."id",
            U."displayName",
            U."gender",
            U."dateOfBirth",
            U."lastActiveAt",
            U."photos",
            U."numOfPhotos",
            U."mainPhoto",
            U."locationName",
            U."latitude",
            U."longitude",
            U."country",
            U."createdAt",
            BU."createdAt" AS "blockedAt",
            Calculate_Age(U."dateOfBirth") AS "age"
        FROM "blockedUsers" BU
        INNER JOIN "users" U ON U."id" = BU."blockedUserId"
        WHERE BU."userId" = $1
        ORDER BY BU."createdAt" DESC
    `, [userId]);

    return results.rows.map(blockedUser => {
        const publicUserDetails = getPublicUserDetails(blockedUser);
        return Object.assign({}, blockedUser, publicUserDetails, {
            lastActiveHumanized: humanizeTimeDiff(blockedUser.lastActiveAt),
            blockedAtHumanized: humanizeTimeDiff(blockedUser.blockedAt)
        });
    });
}

/**
 * Checks if a user has been blocked.
 * @param userId
 * @param blockedUserId
 */
export async function isUserBlocked(userId: number, blockedUserId: number) {
    const result = await pgDbPool.query(`SELECT EXISTS(SELECT 1 FROM "blockedUsers" WHERE "userId" = $1 AND "blockedUserId" = $2) as "isBlocked"`,
        [userId, blockedUserId]);

    return _.get(result.rows, [0, 'isBlocked'], false);
}

/**
 * Gets all users who have pending likes for a given user with filtering and sorting.
 * @param userId The ID of the user
 * @param sortBy Sorting method
 * @param page Page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Object with hasMore boolean and likes array
 */
export async function getUserLikes(
    userId: number,
    sortBy: LikesSortBy = LikesSortBy.ReceivedAt,
    page: number = 1,
    pageSize: number = 60
): Promise<{ hasMore: boolean; likes: UserPreview[] }> {

    const offset = (page - 1) * pageSize;

    let orderByClause: string;
    switch (sortBy) {
        case LikesSortBy.ReceivedAt:
            orderByClause = 'UM."createdAt" DESC, U."lastActiveAt" DESC';
            break;
        case LikesSortBy.LastActive:
            orderByClause = 'U."lastActiveAt" DESC, UM."createdAt" DESC';
            break;
        case LikesSortBy.Newest:
        default:
            orderByClause = 'U."createdAt" DESC, UM."createdAt" DESC';
            break;
    }

    const results = await pgDbPool.query<DbLike>(`
        SELECT 
            U."id",
            U."displayName",
            U."gender",
            U."dateOfBirth",
            U."lastActiveAt",
            U."photos",
            U."numOfPhotos",
            U."mainPhoto",
            U."locationName",
            U."latitude",
            U."longitude",
            U."country",
            U."createdAt",
            UM."id" AS "matchId",
            UM."status" AS "matchStatus",
            UM."createdAt" AS "receivedLikeAt",
            Calculate_Age(U."dateOfBirth") AS "age"
        FROM "userMatches" UM
        INNER JOIN "users" U ON U."id" = UM."userId"
        WHERE UM."recipientId" = $1 
          AND UM."status" = 'pending'
          AND U."id" NOT IN (
              SELECT MU."recipientId" 
              FROM "mutedUsers" MU 
              WHERE MU."userId" = $1
          )
          AND U."id" NOT IN (
              SELECT BU."userId" 
              FROM "blockedUsers" BU 
              WHERE BU."blockedUserId" = $1
          )
        ORDER BY ${orderByClause}
        LIMIT $2 OFFSET $3
    `, [userId, pageSize, offset]);

    const hasMore = results.rows.length === pageSize;
    const likes = results.rows.map(like => {
        const publicUserLike = Object.assign({}, like, getPublicUserDetails(like));

        return Object.assign({}, publicUserLike, {
            lastActiveHumanized: humanizeTimeDiff(publicUserLike.lastActiveAt),
            receivedLikeHumanized: humanizeTimeDiff(publicUserLike.receivedLikeAt)
        });
    });

    return { hasMore, likes };
}

/**
 * Unmute a user by ID.
 * @param userId
 * @param recipientUserId
 * @returns True if the operation was successful
 */
export async function unMuteUserById(userId: number, recipientUserId: number): Promise<boolean> {
    await prisma.mutedUsers.deleteMany({
        where: {
            userId: userId,
            recipientId: recipientUserId
        }
    });

    return true;
}

/**
 * Returns the full user profile.
 * @param userId
 * @param currentUserId
 */
export async function getFullUserProfile(userId: number, currentUserId: number): Promise<{ statusCode: number, userProfileDetails: UserProfileDetail } | { error: string, statusCode: number }> {
    const user = await getUser(userId);
    if (!user) {
        return { error: 'This user account cannot be found.', statusCode: 404 };
    }

    if (user.suspendedAt) {
        return { error: 'This user has been suspended.', statusCode: 400 };
    }

    const isBlocked = await isUserBlocked(userId, currentUserId);
    if (isBlocked) {
        return { error: 'You have been blocked by this user.', statusCode: 403 };
    }

    // Add public user details (including processed photo URLs) to the user object
    const userWithPublicDetails = Object.assign({}, user, getPublicUserDetails(user));

    const userProfileDetails = await getUserProfileDetail(currentUserId, userWithPublicDetails);
    return { statusCode: 200, userProfileDetails };
}

/**
 * Sends a verification email to the user's email address on file.
 * @param userId The user's ID
 * @returns True if the email was sent, false otherwise
 */
export async function sendVerificationEmailToUser(userId: number): Promise<boolean> {
    // Get the user from the database
    const user = await prisma.users.findUnique({
        where: { id: userId }
    });
    if (!user || !user.email) {
        return false;
    }

    // Generate a verification token
    const token = generateCryptoRandomString(32);
    // Store the token and expiry in the database
    await pgDbPool.query(
        `UPDATE users 
         SET "emailVerificationToken" = $1,
             "emailVerificationTokenExpiry" = NOW() + INTERVAL '20 minutes'
         WHERE id = $2`, [token, userId]
    );

    const verificationLink = `${process.env.APP_URL_ROOT}/user/verify/email?token=${token}`

    // Email content
    const content = `
        <h1>Email Verification</h1>
        <p>Hi ${user.firstName}!</p>
        <p>Thank you for registering with Diwa Date!</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationLink}" class="button">Verify Email</a>
        <p>If you did not create an account, you can ignore this email.</p>
    `;

    // Send the email
    const result = await sendEmail([
        user.email
    ], `Email verification for ${user.firstName} ${user.lastName}`, content);
    return !result.hasError;
}

/**
 * Find a user by password reset token.
 * @param resetToken
 */
export async function findUserByPasswordResetToken(resetToken: string) {
    const result = await pgDbPool.query<Pick<User, "id" | "email" | "firstName" | "lastName">>(`
        SELECT id, email, "firstName", "lastName" 
        FROM "users" 
        WHERE "passwordResetToken" = $1 
        AND "passwordResetTokenExpiry" IS NOT NULL 
        AND "passwordResetTokenExpiry" > NOW() 
        LIMIT 1
    `, [resetToken]);

    if (result.rows.length > 0) {
        return result.rows[0];
    }
}

/**
 * Generate password reset token and send email
 * @param email
 */
export async function generatePasswordResetToken(email: string) {
    // Check if user exists
    const user = await prisma.users.findUnique({
        where: { email: email.toLowerCase() }
    });

    if (!user) {
        return null;
    }

    // Generate reset token
    const token = generateCryptoRandomString(32);

    // Store token and expiry in database
    await pgDbPool.query(`
        UPDATE "users" 
        SET "passwordResetToken" = $1, 
            "passwordResetTokenExpiry" = NOW() + INTERVAL '20 minutes', 
            "updatedAt" = NOW() 
        WHERE id = $2
    `, [token, user.id]);

    // Create reset URL
    const resetUrl = `${process.env.APP_URL_ROOT}/user/reset/password?token=${token}`;

    // Email content
    const content = `
        <h1>Password Reset</h1>
        <p>Hi ${user.firstName}!</p>
        <p>We received a request to reset your password for your Diwa Date account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>This link will expire in 30 minutes.</p>
        <p>If you did not request this password reset, you can ignore this email.</p>
    `;

    // Send the email
    const result = await sendEmail([
        user.email
    ], `Password reset for ${user.firstName} ${user.lastName}`, content);

    if (result.hasError) {
        return null;
    }

    return resetUrl;
}

/**
 * Update user's password
 * @param userId
 * @param newPassword
 */
export async function updateUserPassword(userId: number, newPassword: string) {
    const hashedPassword = await hashPassword(newPassword);

    await pgDbPool.query(`
        UPDATE "users" 
        SET "password" = $1,
            "passwordResetToken" = NULL,
            "passwordResetTokenExpiry" = NULL,
            "updatedAt" = NOW()
        WHERE id = $2
    `, [hashedPassword, userId]);
}
