import { prismaRead, prismaWrite } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User, AuthResult, UserPhoto, UserPreview, SubscriptionPlanEnrollment, SessionRequestData } from '../types';
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
import { pgDbReadPool, pgDbWritePool } from "@/lib/postgres";
import { humanizeTimeDiff } from "@/server-side-helpers/time.helpers";
import { UserProfileDetail } from '@/types/user-profile-detail.interface';
import {
    emitNewMatchNotification,
    emitNewNotification,
    emitMatchCanceled,
    emitUserBlocked,
    emitUserUnblocked
} from '@/server-side-helpers/notification-emitter.helper';
import { sendEmail } from './mail.helper';
import { createGenderLabels } from '@/helpers/user.helpers';
import { generateCryptoRandomString } from "@/util";
import { NextResponse } from 'next/server';
import { generateAndSendTwoFactorCode, validateTwoFactorCode } from '@/server-side-helpers/two-factor.helpers';

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
    | "isPremium"
    | "isFoundingMember"
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
    isPremium: boolean;
    matchId: number;
    matchStatus: string;
    receivedLikeAt: Date;
    age: number;
};

export interface MessagingPermissionResult {
    canSend: boolean
    errorMessage?: string
}

/**
 * Get a user by their ID
 * @param id The user's ID
 * @returns The user object without the password or null if not found
 */
export async function getUser(id: number): Promise<User | null> {
    const user = await prismaRead.users.findUnique({
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
    const existingBlock = await prismaRead.blockedUsers.findFirst({
        where: {
            userId: userId,
            blockedUserId: blockedUserId
        }
    });

    if (existingBlock) {
        return true; // Already blocked
    }

    // Create a new block record
    const blockTimestamp = new Date();
    await prismaWrite.blockedUsers.create({
        data: {
            userId: userId,
            blockedUserId: blockedUserId
        }
    });

    // Emit WebSocket event to the blocked user
    try {
        await emitUserBlocked(blockedUserId, {
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
    await prismaWrite.blockedUsers.deleteMany({
        where: {
            userId: userId,
            blockedUserId: blockedUserId
        }
    });

    // Emit WebSocket event to the unblocked user
    try {
        await emitUserUnblocked(blockedUserId, {
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
        return prismaWrite.users.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() }
        });
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
    const { rows: profileDetailResults } = await pgDbReadPool.query(`
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
                       (SELECT "status" FROM "MyMatches" WHERE "recipientId" = $8 OR "userId" = $9 LIMIT 1) AS "matchStatus",
                       (SELECT "id" FROM "MyMatches" WHERE "recipientId" = $10 OR "userId" = $11 LIMIT 1)     AS "matchId",
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

/**
 * Authenticate a user with email and password
 * @param email The user's email
 * @param password The user's password
 * @param response Optional NextResponse to set the session cookie on
 * @param requestData Optional request data for session tracking
 * @returns Authentication result with user data if successful
 */
export async function authenticateUser(
    email: string,
    password: string,
    response?: NextResponse,
    requestData?: SessionRequestData
): Promise<AuthResult> {
    const user = await prismaRead.users.findUnique({
        where: {
            email
        },
        select: {
            id: true,
            email: true,
            password: true,
            require2fa: true,
            firstName: true,
            lastName: true,
            displayName: true
        }
    });

    if (!user) {
        return {
            success: false,
            message: 'The email and/or password does not match our records.'
        };
    }

    if (!user.password) {
        throw new Error('User does not have a password set.');
    }

    // Verify password
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
        return {
            success: false,
            message: 'The email and/or password does not match our records.'
        };
    }

    // Check if 2FA is required
    if (user.require2fa) {
        // Generate and send 2FA code
        const twoFactorResult = await generateAndSendTwoFactorCode(user.id);

        if (!twoFactorResult.success) {
            return {
                success: false,
                message: twoFactorResult.error || 'Failed to send verification code. Please try again.'
            };
        }

        return {
            success: false,
            message: 'Two-factor authentication required',
            requiresTwoFactor: true,
            userId: user.id,
            twoFactorMessage: 'A verification code has been sent to your email address.'
        };
    }

    refreshLastActive(user as unknown as User).then().catch(console.error);

    // Create a session for the user
    const sessionId = await createSession(
        user as unknown as User,
        response,
        requestData
    );

    return {
        success: true,
        sessionId
    };
}

/**
 * Complete two-factor authentication for a user
 * @param userId The user's ID
 * @param code The 6-digit verification code
 * @param response Optional NextResponse to set the session cookie on
 * @param requestData Optional request data for session tracking
 * @returns Authentication result with session if successful
 */
export async function completeTwoFactorAuth(
    userId: number,
    code: string,
    response?: NextResponse,
    requestData?: SessionRequestData,
    cookieConsentDeclined: boolean = false
): Promise<AuthResult> {
    // Validate the 2FA code
    const validationResult = await validateTwoFactorCode(userId, code);

    if (!validationResult.success) {
        return {
            success: false,
            message: validationResult.error || 'Invalid verification code'
        };
    }

    // Get the full user data for session creation
    const user = await prismaRead.users.findUnique({
        where: { id: userId }
    });

    if (!user) {
        return {
            success: false,
            message: 'User not found'
        };
    }

    refreshLastActive(user as unknown as User).then().catch(console.error);

    // Create a session for the user
    const sessionId = await createSession(
        user as unknown as User,
        response,
        requestData,
        cookieConsentDeclined
    );

    return {
        userId: user.id,
        success: true,
        sessionId
    };
}

/**
 * Returns the currently logged-in user.
 * @param cookieStore
 * @param usePublic
 */
export async function getCurrentUser(cookieStore: ReadonlyRequestCookies, usePublic = true) {
    const sessionId = await getSessionId(cookieStore);

    if (!sessionId) {
        return undefined;
    }

    // Get session data from Redis
    const sessionData = await getSessionData(sessionId);

    if (!sessionData) {
        return undefined;
    }

    const userId = Number(sessionData.userId);

    const { rows } = await pgDbReadPool.query(`
        SELECT
            u.*,
            spe."id" as "subscriptionPlanEnrollmentId",
            spe."userId" as "subscriptionPlanEnrollmentUserId",
            spe."subscriptionPlanId",
            spe."lastPaymentAt",
            spe."nextPaymentAt",
            spe."startedAt",
            spe."endsAt",
            spe."createdAt" as "subscriptionPlanEnrollmentCreatedAt",
            spe."updatedAt" as "subscriptionPlanEnrollmentUpdatedAt",
            spe."price",
            spe."chargeInterval",
            spe."priceUnit",
            spe."lastEvalAt",
            sp."id" as "subscriptionPlanId",
            sp."name" as "subscriptionPlanName",
            sp."description" as "subscriptionPlanDescription",
            sp."createdAt" as "subscriptionPlanCreatedAt",
            sp."updatedAt" as "subscriptionPlanUpdatedAt",
            sp."listPrice",
            sp."listPriceUnit"
        FROM "users" u
        LEFT JOIN "subscriptionPlanEnrollments" spe ON u."id" = spe."userId"
        LEFT JOIN "subscriptionPlans" sp ON spe."subscriptionPlanId" = sp."id"
        WHERE u."id" = $1
          AND u."suspendedAt" IS NULL
        ORDER BY spe."createdAt" DESC
        LIMIT 1
    `, [userId]);

    if (rows.length === 0) {
        return undefined;
    }

    const user = rows[0];

    // Add subscription enrollment if it exists
    if (user.subscriptionPlanEnrollmentId) {
        user.subscriptionPlanEnrollments = [{
            id: user.subscriptionPlanEnrollmentId,
            userId: user.subscriptionPlanEnrollmentUserId,
            subscriptionPlanId: user.subscriptionPlanId,
            lastPaymentAt: user.lastPaymentAt,
            nextPaymentAt: user.nextPaymentAt,
            startedAt: user.startedAt,
            endsAt: user.endsAt,
            createdAt: user.subscriptionPlanEnrollmentCreatedAt,
            updatedAt: user.subscriptionPlanEnrollmentUpdatedAt,
            price: user.price,
            chargeInterval: user.chargeInterval,
            priceUnit: user.priceUnit,
            lastEvalAt: user.lastEvalAt,
            subscriptionPlans: {
                id: user.subscriptionPlanId,
                name: user.subscriptionPlanName,
                description: user.subscriptionPlanDescription,
                createdAt: user.subscriptionPlanCreatedAt,
                updatedAt: user.subscriptionPlanUpdatedAt,
                listPrice: user.listPrice,
                listPriceUnit: user.listPriceUnit
            }
        }];
    }

    return usePublic ? Object.assign({}, user, getPublicUserDetails(user)) : user;
}

/**
 * Validate email for user
 * @param token
 * @param currentUserId
 * @returns
 */
export async function verifyUserEmail(token: string, currentUserId: number) {
    const { rows: users } = await pgDbReadPool.query(
        `SELECT * FROM users WHERE "emailVerificationToken" = $1 AND "emailVerificationTokenExpiry" > NOW() LIMIT 1`,
        [token]
    );

    const user = users[0];

    if (!user || (currentUserId !== user.id)) {
        return { error: 'Unauthorized', status: 401 };
    }

    await pgDbWritePool.query(
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
 * Get the active subscription enrollment for a user by their ID
 * @param userId The user's ID
 * @returns The active subscription enrollment or null if none found
 */
export async function getUserActiveSubscription(userId: number): Promise<SubscriptionPlanEnrollment | null> {
    const subscription = await prismaRead.subscriptionPlanEnrollments.findFirst({
        where: {
            userId: userId,
            startedAt: {
                lte: new Date()
            },
            OR: [
                { endsAt: null }, // Ongoing subscription
                { endsAt: { gte: new Date() } } // Not yet expired
            ]
        },
        include: {
            subscriptionPlans: true
        }
    });

    return subscription as SubscriptionPlanEnrollment | null;
}

/**
 * Check if a user has an active premium subscription
 * @param userId The user's ID
 * @returns True if the user has an active premium subscription, false otherwise
 */
export async function isUserPremium(userId: number): Promise<boolean> {
    const subscription = await getUserActiveSubscription(userId);
    return !!subscription;
}

/**
 * Check if a user with the given email already exists
 * @param email The email to check
 * @returns True if a user with this email exists, false otherwise
 */
export async function checkUserExists(email: string): Promise<boolean> {
    const user = await prismaRead.users.findUnique({
        where: {
            email: email.toLowerCase()
        }
    });

    return !!user;
}

/**
 * Update user account with correct
 * @param userId
 * @param newEmail
 */
export async function generateEmailUpdateUrl(userId: number, newEmail: string) {
    const token = generateCryptoRandomString(32);
    await pgDbWritePool.query(`UPDATE "users" SET "resetToken" = $1, 
                                             "resetTokenExpiry" = NOW() + INTERVAL '20 minutes', 
                                             "newDesiredEmail" = $2,
                                             "updatedAt" = NOW() WHERE id = $3`, [token, newEmail.toLowerCase(), userId]);

    return `${process.env.NEXT_PUBLIC_BASE_URL}/user/reset/email?token=${token}`;
}

/**
 * Update the user's email.
 * @param userId
 * @param newEmail
 */
export async function updateUserEmail(userId: number, newEmail: string) {
    await pgDbWritePool.query(`
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
        photos: user.photos?.length ? user.photos.filter(p => !p.isRejected) : [],
        publicPhotos: user.photos?.length ?
            user.photos.filter(p => !p.isRejected)
                .map((p: any) => appendMediaRootToImage(p)) : []
    };
}

/**
 * Checks if a user is suspended
 * @param userId
 */
export async function isUserSuspended(userId: number) {
    const result = await pgDbReadPool.query(`SELECT ("suspendedAt" IS NOT NULL) AS "isSuspended"
                                               FROM users
                                               WHERE id = $1`, [userId]);

    return _.get(result.rows, [0, 'isSuspended']);
}

/**
 * Find a user by reset Token.
 * @param resetToken
 */
export async function findUserByResetToken(resetToken: string) {
    const result = await pgDbReadPool.query<Pick<User, "id" | "newDesiredEmail" | "password">>(`SELECT id, "newDesiredEmail", "password" FROM "users" WHERE "resetToken" = $1 
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
        await prismaWrite.users.update({
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
    // Check if the current user is onboarded and has enough photos
    const currentUser = await getUser(userId);
    if (!currentUser) {
        return { error: 'User not found.' };
    }

    if (!currentUser.emailVerifiedAt) {
        return { error: 'You must verify your email address before you can like other users.' };
    }

    if (!currentUser.profileCompletedAt) {
        return { error: 'You must complete your profile before you can like other users.' };
    }

    if (currentUser.numOfPhotos < 3) {
        return { error: 'You must have at least 3 photos uploaded to your profile before you can like other users.' };
    }

    if (await isUserSuspended(recipientUserId)) {
        return { error: 'You cannot send a like to this user because they have been suspended.' }
    }

    if (await isUserBlocked(recipientUserId, userId)) {
        return { error: 'You have been blocked by this user.' };
    }

    // Check if a match already exists
    const existingMatch = await prismaRead.userMatches.findFirst({
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
        await prismaWrite.userMatches.update({
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
            const existingNotification = await prismaRead.notifications.findFirst({
                where: {
                    userId: userId,
                    recipientId: existingMatch.userId
                }
            });

            // Only create the notification if one doesn't already exist
            if (!existingNotification) {
                const notification = await prismaWrite.notifications.create({
                    data: {
                        userId: userId, // The user who confirmed the match
                        recipientId: existingMatch.userId, // The user who originally initiated the match
                        type: 'match',
                        data: { matchId: existingMatch.id },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                // Send real-time notification for a confirmed match
                try {
                    const senderUser = await getUser(userId);
                    if (senderUser) {
                        await emitNewNotification(existingMatch.userId, {
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

                        await emitNewMatchNotification(existingMatch.userId, {
                            id: existingMatch.id,
                            status: 'matched',
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
        }

        return 'matched';
    }

    if (existingMatch) {
        return existingMatch.status as 'pending' | 'matched';
    }

    // Create a new match with pending status
    const newMatch = await prismaWrite.userMatches.create({
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
            await emitNewMatchNotification(recipientUserId, {
                id: newMatch.id,
                status: 'pending',
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

    await prismaWrite.mutedUsers.deleteMany({
        where: {
            userId: recipientUserId,
            recipientId: userId
        }
    });

    return 'pending';
}

/**
 * Check if a user can send a message to another user based on premium status.
 * Rules:
 * - Free users can only message premium users
 * - Premium users can message anyone (premium or free)
 *
 * @param senderId - ID of the user sending the message
 * @param recipientId - ID of the user receiving the message
 * @returns Permission result with ability to send and optional error message
 */
export async function canUserMessage(senderId: number, recipientId: number): Promise<MessagingPermissionResult> {
    try {
        // Get both users' premium status in one query
        const usersResult = await pgDbReadPool.query(
            `SELECT id, "isPremium" FROM users WHERE id = ANY($1)`,
            [[senderId, recipientId]]
        )

        const users = usersResult.rows
        const sender = users.find(u => u.id === senderId)
        const recipient = users.find(u => u.id === recipientId)

        if (!sender || !recipient) {
            return {
                canSend: false,
                errorMessage: 'User not found.'
            }
        }

        return {
            canSend: sender.isPremium || recipient.isPremium
        }
    } catch (error) {
        console.error('Error checking messaging permission:', error)
        return {
            canSend: false,
            errorMessage: 'Unable to verify messaging permissions. Please try again.'
        }
    }
}

/**
 * Remove a match request between two users
 * @param userId The ID of the user removing the match
 * @param recipientUserId The ID of the other user in the match
 */
export async function removeUserMatchRequest(userId: number, recipientUserId: number): Promise<void> {
    // First get the match information before deleting for WebSocket notification
    const existingMatch = await prismaRead.userMatches.findFirst({
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
    await prismaWrite.userMatches.deleteMany({
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
        // Mute user if this was a match being removed
        if (existingMatch.status === 'matched') {
            await muteUserById(userId, recipientUserId);
            await prismaWrite.$queryRaw`DELETE FROM "notifications" WHERE (data #>> '{matchId}')::integer = ${existingMatch.id}`;
        }

        try {
            // Determine who the other user is (not the one cancelling)
            const otherUserId = existingMatch.userId === userId ? existingMatch.recipientId : existingMatch.userId;

            await emitMatchCanceled(otherUserId, {
                id: existingMatch.id,
                canceledBy: userId
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
    const existingMuted = await prismaRead.mutedUsers.findFirst({
        where: {
            userId: userId,
            recipientId: recipientUserId
        }
    });

    // If there is no record, insert one
    if (!existingMuted) {
        await prismaWrite.mutedUsers.create({
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
    const results = await pgDbReadPool.query(`
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
            U."isPremium",
            BU."createdAt" AS "blockedAt",
            Calculate_Age(U."dateOfBirth") AS "age"
        FROM "blockedUsers" BU
        INNER JOIN "users" U ON U."id" = BU."blockedUserId" AND U."suspendedAt" IS NULL
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
    const result = await pgDbReadPool.query(`SELECT EXISTS(SELECT 1 FROM "blockedUsers" WHERE "userId" = $1 AND "blockedUserId" = $2) as "isBlocked"`,
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
    pageSize: number = 400
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

    const results = await pgDbReadPool.query<DbLike>(`
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
            U."isPremium",
            UM."id" AS "matchId",
            UM."status" AS "matchStatus",
            UM."createdAt" AS "receivedLikeAt",
            Calculate_Age(U."dateOfBirth") AS "age"
        FROM "userMatches" UM
        INNER JOIN "users" U ON U."id" = UM."userId" AND U."suspendedAt" IS NULL
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
    await prismaWrite.mutedUsers.deleteMany({
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

    // Check gender preferences - allow users to view their own profile
    if (userId !== currentUserId) {
        const currentUser = await getUser(currentUserId);
        if (!currentUser) {
            return { error: 'Current user not found.', statusCode: 401 };
        }

        // Check if target user's seekingGender includes current user's gender
        if (user.seekingGender && currentUser.gender) {
            const isGenderMatch = user.seekingGender === 'both' ||
                user.seekingGender === currentUser.gender;

            if (!isGenderMatch) {
                return {
                    error: `This profile has indicated they are seeking ${user.seekingGender} and your profile indicates you are ${currentUser.gender}.`,
                    statusCode: 403
                };
            }
        }
    }

    // Add public user details (including processed photo URLs) to the user object
    const userWithPublicDetails = Object.assign({}, user, getPublicUserDetails(user));

    const userProfileDetails = await getUserProfileDetail(currentUserId, userWithPublicDetails);
    return { statusCode: 200, userProfileDetails };
}

/**
 * Sends a verification email to the user's email address on file.
 * @param userId The user's ID
 * @param email The user's email address
 * @returns True if the email was sent, false otherwise
 */
export async function sendVerificationEmailToUser(userId: number, email: string, firstName: string, lastName: string): Promise<boolean> {
    // Generate a random 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await pgDbWritePool.query(
        `UPDATE users 
         SET "emailVerificationToken" = $1,
             "emailVerificationTokenExpiry" = NOW() + INTERVAL '20 minutes'
         WHERE id = $2`, [verificationCode, userId]
    );

    // Email content
    const content = `
        <h1>Email Verification</h1>
        <p>Hi ${firstName} ${lastName}!</p>
        <p>Thank you for registering with Diwa Date!</p>
        <p>Your verification code is:</p>
        <h2 style="font-size: 32px; letter-spacing: 5px; color: #3b82f6; text-align: center; margin: 20px 0;">${verificationCode}</h2>
        <p>This code will expire in 20 minutes.</p>
        <p>If you did not create an account, you can ignore this email.</p>
    `;

    // Send the email
    const result = await sendEmail([
        email
    ], `Email verification code for ${firstName} ${lastName}`, content);
    return !result.hasError;
}

/**
 * Find a user by password reset token.
 * @param resetToken
 */
export async function findUserByPasswordResetToken(resetToken: string) {
    const result = await pgDbReadPool.query<Pick<User, "id" | "email" | "firstName" | "lastName">>(`
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
    // Check if a user exists
    const user = await prismaRead.users.findUnique({
        where: { email: email.toLowerCase() }
    });

    if (!user) {
        return null;
    }

    // Generate reset token
    const token = generateCryptoRandomString(32);

    // Store token and expiry in the database
    await pgDbWritePool.query(`
        UPDATE "users" 
        SET "passwordResetToken" = $1, 
            "passwordResetTokenExpiry" = NOW() + INTERVAL '20 minutes', 
            "updatedAt" = NOW() 
        WHERE id = $2
    `, [token, user.id]);

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/user/reset/password?token=${token}`;

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

    await pgDbWritePool.query(`
        UPDATE "users" 
        SET "password" = $1,
            "passwordResetToken" = NULL,
            "passwordResetTokenExpiry" = NULL,
            "updatedAt" = NOW()
        WHERE id = $2
    `, [hashedPassword, userId]);
}

/**
 * Update personal information for a user (validation and DB update only).
 * @param currentUser The user object (must have .id)
 * @param data The personal information data to update
 * @returns { success: boolean, errors?: Record<string, string> }
 */
export async function updatePersonalInformationForUser(currentUser: any, data: any) {
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Validate required fields
        const errors: Record<string, string> = {};

        if (!data.displayName?.trim()) {
            errors.displayName = 'Display name is required';
        } else if (data.displayName.trim().length > 20) {
            errors.displayName = 'Display name cannot be longer than 20 characters';
        }

        if (!data.firstName?.trim()) {
            errors.firstName = 'First name is required';
        }

        if (!data.lastName?.trim()) {
            errors.lastName = 'Last name is required';
        }

        if (!data.location) {
            errors.location = 'Location is required';
        }

        if (!data.dateOfBirth) {
            errors.dateOfBirth = 'Date of birth is required';
        } else {
            const birthDate = new Date(data.dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                if (age - 1 < 18) {
                    errors.dateOfBirth = 'You must be at least 18 years old';
                }
            } else if (age < 18) {
                errors.dateOfBirth = 'You must be at least 18 years old';
            }
        }

        if (!data.userGender) {
            errors.userGender = 'Gender is required';
        }

        if (!data.seekingGender) {
            errors.seekingGender = 'Seeking gender is required';
        }

        // Bio validation
        if (data.bio && (data.bio.length < 50 || data.bio.length > 3000)) {
            errors.bio = 'About me must be between 50 and 3000 characters';
        }

        // Multi-select limits
        if (data.ethnicities?.length > 3) {
            errors.ethnicities = 'You can select up to 3 ethnicities';
        }

        if (data.religions?.length > 3) {
            errors.religions = 'You can select up to 3 religions';
        }

        if (data.languages?.length > 3) {
            errors.languages = 'You can select up to 3 languages';
        }

        if (data.interests?.length > 7) {
            errors.interests = 'You can select up to 7 interests';
        }

        if (Object.keys(errors).length > 0) {
            return { success: false, errors };
        }

        // Prepare update data
        const updateData: any = {
            displayName: data.displayName,
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: new Date(data.dateOfBirth),
            bio: data.bio || null,
            gender: data.userGender,
            seekingGender: data.seekingGender,
            height: data.height || null,
            bodyType: data.bodyType || null,
            ethnicities: data.ethnicities?.length > 0 ? data.ethnicities : null,
            religions: data.religions?.length > 0 ? data.religions : null,
            education: data.education || null,
            languages: data.languages?.length > 0 ? data.languages : null,
            maritalStatus: data.maritalStatus || null,
            hasChildren: data.hasChildren || null,
            wantsChildren: data.wantsChildren || null,
            drinking: data.drinking || null,
            smoking: data.smoking || null,
            interests: data.interests?.length > 0 ? data.interests : null,
            updatedAt: new Date(),
            profileCompletedAt: currentUser.profileCompletedAt,
            currentOnboardingSteps: currentUser.currentOnboardingSteps
        };

        // Add location data if provided
        if (data.location && data.location.coordinates) {
            updateData.locationName = data.location.name;
            updateData.latitude = data.location.coordinates.latitude;
            updateData.longitude = data.location.coordinates.longitude;
            updateData.country = data.location.country;
            updateData.locationViewport = data.location.viewport || null;
        }

        // Check if all required fields are present and valid
        const isProfileComplete = (
            !!data.height &&
            !!data.bodyType &&
            Array.isArray(data.ethnicities) && data.ethnicities.length > 0 &&
            Array.isArray(data.religions) && data.religions.length > 0 &&
            Array.isArray(data.languages) && data.languages.length > 0 &&
            !!data.maritalStatus &&
            !!data.hasChildren &&
            !!data.wantsChildren &&
            !!(data.bio || '').trim() &&
            !!data.drinking &&
            !!data.smoking &&
            Array.isArray(data.interests) && data.interests.length > 0
        );

        if (!isProfileComplete) {
            updateData.profileCompletedAt = null;
        } else {
            // Only set profileCompletedAt if it was previously null
            const user = await prismaRead.users.findUnique({
                where: { id: currentUser.id },
                select: { profileCompletedAt: true }
            });
            if (!user?.profileCompletedAt) {
                updateData.profileCompletedAt = new Date();
                updateData.currentOnboardingSteps = null;
            }
        }

        // Update the user in the database
        if (data.location && data.location.coordinates) {
            await prismaWrite.$executeRaw`
                UPDATE users 
                SET 
                    "displayName" = ${updateData.displayName},
                    "firstName" = ${updateData.firstName},
                    "lastName" = ${updateData.lastName},
                    "dateOfBirth" = ${updateData.dateOfBirth},
                    "bio" = ${updateData.bio},
                    "gender" = ${updateData.gender},
                    "seekingGender" = ${updateData.seekingGender},
                    "height" = ${updateData.height},
                    "bodyType" = ${updateData.bodyType},
                    "ethnicities" = ${updateData.ethnicities ? JSON.stringify(updateData.ethnicities) : null}::jsonb,
                    "religions" = ${updateData.religions ? JSON.stringify(updateData.religions) : null}::jsonb,
                    "education" = ${updateData.education},
                    "languages" = ${updateData.languages ? JSON.stringify(updateData.languages) : null}::jsonb,
                    "maritalStatus" = ${updateData.maritalStatus},
                    "hasChildren" = ${updateData.hasChildren},
                    "wantsChildren" = ${updateData.wantsChildren},
                    "drinking" = ${updateData.drinking},
                    "smoking" = ${updateData.smoking},
                    "interests" = ${updateData.interests ? JSON.stringify(updateData.interests) : null}::jsonb,
                    "locationName" = ${updateData.locationName},
                    "latitude" = ${updateData.latitude},
                    "longitude" = ${updateData.longitude},
                    "country" = ${updateData.country},
                    "locationViewport" = ${updateData.locationViewport},
                    "geoPoint" = ST_SetSRID(ST_MakePoint(${data.location.coordinates.longitude}, ${data.location.coordinates.latitude}), 4326),
                    "updatedAt" = ${updateData.updatedAt},
                    "profileCompletedAt" = ${updateData.profileCompletedAt},
                    "currentOnboardingSteps" = ${updateData.currentOnboardingSteps}
                WHERE "id" = ${currentUser.id}
            `;
        } else {
            // Update without geoPoint changes
            await prismaWrite.users.update({
                where: { id: currentUser.id },
                data: updateData
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Personal information update error:', error);
        return { success: false };
    }
}

/**
 * Report a user for inappropriate content or behavior
 * @param reportingUserId The ID of the user making the report
 * @param reportedUserId The ID of the user being reported
 * @param reportContent The reason for reporting
 * @returns Success status and any error messages
 */
export async function reportUser(
    reportingUserId: number,
    reportedUserId: number,
    reportContent: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Validation
        if (reportingUserId === reportedUserId) {
            return { success: false, error: "You cannot report yourself" };
        }

        // Validate report content length
        const trimmedContent = reportContent.trim();
        if (trimmedContent.length < 10) {
            return { success: false, error: "Report description must be at least 10 characters long" };
        }
        if (trimmedContent.length > 1000) {
            return { success: false, error: "Report description must be less than 1000 characters" };
        }

        // Check if the reported user exists
        const reportedUser = await getUser(reportedUserId);
        if (!reportedUser) {
            return { success: false, error: "User not found" };
        }

        // Check if a report already exists
        const existingReport = await pgDbReadPool.query(
            `SELECT id FROM "userReports" WHERE "userId" = $1 AND "reportedUserId" = $2`,
            [reportingUserId, reportedUserId]
        );

        if (existingReport.rows.length > 0) {
            return { success: false, error: "You have already reported this user" };
        }

        // Create the report
        await pgDbWritePool.query(
            `INSERT INTO "userReports" ("userId", "reportedUserId", "reportContent", "status", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 'pending', NOW(), NOW())`,
            [reportingUserId, reportedUserId, trimmedContent]
        );

        // Remove any existing match between the users
        await removeUserMatchRequest(reportingUserId, reportedUserId);

        // Also mute the reported user to prevent them from matching again
        await muteUserById(reportingUserId, reportedUserId);

        return { success: true };
    } catch (error: any) {
        logError(error);
        return { success: false, error: "Failed to submit report. Please try again." };
    }
}
