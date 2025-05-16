import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { User, AuthResult, UserPhoto } from '../types';
import moment from "moment";
import _ from "lodash";
import {
    createSession,
    getSessionData,
    getSessionId,
    rotateSession,
    deleteSession
} from './session.helpers';
import { indexUserForSearch, updateUserSearchDocument } from "@/server-side-helpers/search.helpers";
import mySqlDbPool from "@/lib/mysql";
import { businessConfig } from "@/config/business";
import { transformBigInts } from "@/util";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { logError } from "@/server-side-helpers/logging.helpers";

/**
 * Get a user by their ID
 * @param id The user's ID
 * @returns The user object without the password or null if not found
 */
export async function getUser(id: number): Promise<User | null> {
    const user = await prisma.users.findUnique({
        where: {
            id: BigInt(id)
        }
    });

    if (!user) {
        return null;
    }

    return prepareUser(user as unknown as User);
}

/**
 * Block a user
 * @param userId The ID of the user doing the blocking
 * @param blockedUserId The ID of the user being blocked
 * @returns True if the operation was successful
 */
export async function blockUser(userId: number, blockedUserId: number) {
    // Check if already blocked
    const existingBlock = await prisma.blocked_users.findFirst({
        where: {
            user_id: BigInt(userId),
            blocked_user_id: BigInt(blockedUserId)
        }
    });

    if (existingBlock) {
        return true; // Already blocked
    }

    // Create new block record
    await prisma.blocked_users.create({
        data: {
            user_id: BigInt(userId),
            blocked_user_id: BigInt(blockedUserId)
        }
    });

    // Update search index
    await indexUserForSearch(blockedUserId);
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
    await prisma.blocked_users.deleteMany({
        where: {
            user_id: BigInt(userId),
            blocked_user_id: BigInt(blockedUserId)
        }
    });

    // Update search index
    await indexUserForSearch(blockedUserId);

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
                where: {id: user.id},
                data: {last_active_at: new Date()}
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
export async function getUserProfileDetail(currentUserId: number | bigint, user: User) {
    const [profileDetailResults] = await mySqlDbPool.query<any[]>(`
        WITH TheyBlockedMeIds AS (SELECT BU.user_id
                                  FROM blocked_users BU
                                  WHERE blocked_user_id = ?),
             IBlockedThemIds AS (SELECT BU.blocked_user_id
                                 FROM blocked_users BU
                                 WHERE user_id = ?),
             IMutedThemIds AS (SELECT MU.recipient_id
                               FROM muted_users MU
                               WHERE MU.user_id = ?),
             MyMatches AS (SELECT M.*
                           FROM user_matches M
                           WHERE (M.recipient_id = ? OR M.user_id = ?)
                             AND M.recipient_id NOT IN (SELECT user_id FROM TheyBlockedMeIds)
                             AND M.user_id NOT IN (SELECT recipient_id FROM IMutedThemIds))

        SELECT EXISTS(SELECT 1 FROM TheyBlockedMeIds WHERE user_id = ?)             AS they_blocked_me,
               EXISTS(SELECT 1 FROM IBlockedThemIds WHERE blocked_user_id = ?)      AS blocked_them,
               (SELECT status FROM MyMatches WHERE recipient_id = ? OR user_id = ?) AS match_status,
               (SELECT id FROM MyMatches WHERE recipient_id = ? OR user_id = ?)     AS match_id,
               EXISTS(SELECT 1 FROM MyMatches WHERE user_id = ?)                    AS match_is_towards_me`, [currentUserId, currentUserId, currentUserId,
        currentUserId, currentUserId, user.id, user.id, user.id, user.id, user.id, user.id, user.id]);

    const additionalProfileDetails = _.first(profileDetailResults) as
        {
            they_blocked_me: boolean,
            blocked_them: boolean,
            match_status?: string,
            match_id?: number,
            match_is_towards_me: boolean
        };

    return {
        user,
        seeking_label: createGenderLabels(user.seeking_genders),
        marital_status_label: user.marital_status ?
            businessConfig.options.maritalStatuses[user.marital_status as keyof typeof businessConfig.options.maritalStatuses] : 'No Answer',
        interest_labels: (user.interests || [])
            .map((interest) => businessConfig.options.interests[interest as keyof typeof businessConfig.options.interests]),
        wants_children_label: user.wants_children ?
            businessConfig.options.wantsChildrenStatuses[user.wants_children as keyof typeof businessConfig.options.wantsChildrenStatuses] : 'No Answer',
        has_children_label: user.has_children ?
            businessConfig.options.hasChildrenStatuses[user.has_children as keyof typeof businessConfig.options.hasChildrenStatuses] : 'No Answer',
        education_label: user.education ?
            businessConfig.options.educationLevels[user.education as keyof typeof businessConfig.options.educationLevels] : 'No Answer',
        smoking_label: user.smoking ?
            businessConfig.options.smokingStatuses[user.smoking as keyof typeof businessConfig.options.smokingStatuses] : 'No Answer',
        drinking_label: user.drinking ?
            businessConfig.options.drinkingStatuses[user.drinking as keyof typeof businessConfig.options.drinkingStatuses] : 'No Answer',
        religion_label: (user.religions || []).map((religion) => businessConfig.options.religions[religion as keyof typeof businessConfig.options.religions]).join(', '),
        body_type_label: user.body_type ?
            businessConfig.options.bodyTypes[user.body_type as keyof typeof businessConfig.options.bodyTypes] : 'No Answer',
        height_label: user.height ? businessConfig.options.height[user.height as keyof typeof businessConfig.options.height] : 'No Answer',
        ethnicity_label: (user.ethnicities || []).map(ethnicity =>
            businessConfig.options.ethnicities[ethnicity as keyof typeof businessConfig.options.ethnicities] || ethnicity).join(', '),
        match_accepted_at: '',
        ...additionalProfileDetails
    };
}

/**
 * Create appropriate gender seeking label.
 * @param genders
 * @returns string
 */
function createGenderLabels(genders: string[]) {
    if (genders.length === 2) {
        return 'Men and Women';
    }

    return genders[0] === 'male' ? 'Men' : 'Women';
}

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
            message: 'Invalid email or password'
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

    // const newSessionId = await rotateSession(sessionId, cookieStore);
    // if (newSessionId) {
    //   cookieStore.set({
    //     name: SESSION_COOKIE_NAME,
    //     value: newSessionId,
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === 'production',
    //     sameSite: 'strict',
    //     maxAge: SESSION_EXPIRY,
    //     path: '/'
    //   });
    // }

    // Get the user from the database
    const result = await prisma.users.findUnique({
        where: {
            id: BigInt(sessionData.userId),
            suspended_at: null
        },
        include: {
            subscription_plan_enrollments: {
                include: {
                    subscription_plans: true
                },
                take: 1
            }
        }
    });

    if (!result) {
        return undefined;
    }

    const user = result as unknown as User;
    return prepareUser(user);
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
    if (lImage.cropped_image_data?.cropped_image_path) {
        lImage.cropped_image_data.cropped_image_path = appendMediaRootToImageUrl(lImage.cropped_image_data.cropped_image_path)
            || lImage.cropped_image_data.cropped_image_path;
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
export function checkSubscriptionActive(user: Omit<User, 'password'> & Partial<Pick<User, 'password'>>): boolean {
    const subscription = _.first(user.subscription_plan_enrollments);
    if (!subscription) {
        return false;
    }

    return (!subscription.ends_at || moment(subscription.ends_at).startOf('day').isAfter(moment().startOf('day')));
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
 * @param { date_of_birth }
 * @returns number
 */
export function calculateUserAge({date_of_birth}: { date_of_birth: Date | string }) {
    const curDate = new Date();
    const lDateOfBirth = typeof date_of_birth === 'string' ? moment(date_of_birth).toDate() : date_of_birth;

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
export function getMainCroppedImageData(data: Pick<User, 'photos' | 'main_photo'>) {
    if (!data.main_photo || !data.photos)
        return undefined;

    const mainPhotoCroppedImageData = data.photos.find(p => p.path === data.main_photo)?.cropped_image_data;
    if (mainPhotoCroppedImageData) {
        mainPhotoCroppedImageData.cropped_image_path =
            appendMediaRootToImageUrl(mainPhotoCroppedImageData.cropped_image_path) || mainPhotoCroppedImageData.cropped_image_path;
    }

    return mainPhotoCroppedImageData;
}

/**
 * Prepare user for API access.
 *
 * @param user
 * @returns
 */
export function prepareUser(user: User) {
    if (user.password) {
        user.password = ''
    }

    user.age = calculateUserAge(user);

    user.is_subscription_active = checkSubscriptionActive(user);

    if (user.main_photo && user.photos) {
        user.public_main_photo = appendMediaRootToImageUrl(user.main_photo);
        user.main_photo_cropped_image_data = getMainCroppedImageData(user)
    }

    if (user.photos && user.photos.length) {
        user.public_photos = user.photos.map(p => appendMediaRootToImage(p));
    }

    return transformBigInts(user) as User;
}

/**
 * Checks if a user is suspended
 * @param userId
 */
export async function isUserSuspended(userId: number) {
    const [results] = await mySqlDbPool.query(`SELECT (suspended_at IS NOT NULL) AS isSuspended
                                               FROM users
                                               WHERE id = ?`, [userId]);
    return _.get(results, [0, 'isSuspended']) === 1;
}

/**
 * Suspends or unsuspends a user
 * @param userId The ID of the user to suspend or unsuspend
 * @param suspend If true, suspends the user; if false, unsuspends the user
 * @returns True if the operation was successful, false otherwise
 */
export async function suspendUser(userId: number, suspend: boolean = true): Promise<boolean> {
    try {
        const suspendedAt = suspend ? new Date() : null;

        // Update the user record in the database
        await prisma.users.update({
            where: {
                id: BigInt(userId)
            },
            data: {
                suspended_at: suspendedAt
            }
        });

        // Update the user's search document
        await updateUserSearchDocument(userId, {
            doc: {
                suspended_at: suspendedAt
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
 * @returns The status of the match after the operation ('pending' or 'matched')
 */
export async function sendUserMatchRequest(userId: number, recipientUserId: number): Promise<'pending' | 'matched' | {
    error: string
}> {
    if (await isUserSuspended(recipientUserId)) {
        return {error: 'You cannot send a like to this user because they have been suspended.'}
    }

    if (await isUserBlocked(recipientUserId, userId)) {
        return {error: 'You have been blocked by this user.'};
    }

    // Check if a match already exists
    const existingMatch = await prisma.user_matches.findFirst({
        where: {
            OR: [
                {
                    user_id: BigInt(userId),
                    recipient_id: BigInt(recipientUserId)
                },
                {
                    user_id: BigInt(recipientUserId),
                    recipient_id: BigInt(userId)
                }
            ]
        }
    });

    // If there's an existing match where the current user is the recipient,
    // this means the other user already liked them, so we should confirm the match
    if (existingMatch && existingMatch.recipient_id === BigInt(userId) && existingMatch.status === 'pending') {
        await prisma.user_matches.update({
            where: {
                id: existingMatch.id
            },
            data: {
                status: 'matched',
                updated_at_timestamp: BigInt(Date.now()),
                updated_at: new Date()
            }
        });
        return 'matched';
    }

    // If there's an existing match where the current user is the sender,
    // or if the match is already confirmed, just return the current status
    if (existingMatch) {
        return existingMatch.status as 'pending' | 'matched';
    }

    // Create a new match with pending status
    await prisma.user_matches.create({
        data: {
            user_id: BigInt(userId),
            recipient_id: BigInt(recipientUserId),
            status: 'pending',
            updated_at_timestamp: BigInt(Date.now()),
            created_at: new Date(),
            updated_at: new Date()
        }
    });

    await prisma.muted_users.deleteMany({
        where: {
            user_id: BigInt(recipientUserId),
            recipient_id: BigInt(userId)
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
    // Delete any match between these users
    await prisma.user_matches.deleteMany({
        where: {
            OR: [
                {
                    user_id: BigInt(userId),
                    recipient_id: BigInt(recipientUserId)
                },
                {
                    user_id: BigInt(recipientUserId),
                    recipient_id: BigInt(userId)
                }
            ]
        }
    });
}

/**
 * Mutes a user by ID.
 * @param userId
 * @param recipientUserId
 * @returns True if the operation was successful
 */
export async function muteUserById(userId: number, recipientUserId: number): Promise<boolean> {
    // Check if there is a muted_user record by user_id and muted_user_id
    const existingMuted = await prisma.muted_users.findFirst({
        where: {
            user_id: BigInt(userId),
            recipient_id: BigInt(recipientUserId)
        }
    });

    // If there is no record, insert one
    if (!existingMuted) {
        await prisma.muted_users.create({
            data: {
                user_id: BigInt(userId),
                recipient_id: BigInt(recipientUserId),
                created_at: new Date(),
                updated_at: new Date()
            }
        });
    }

    return true;
}

/**
 * Checks if a user has been blocked.
 * @param userId
 * @param blockedUserId
 */
export async function isUserBlocked(userId: number, blockedUserId: number) {
    const [results] = await mySqlDbPool.query<any>(`SELECT EXISTS(SELECT 1 FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?) as isBlocked`,
        [userId, blockedUserId]);

    return results[0].isBlocked === 1;
}

/**
 * Unmute a user by ID.
 * @param userId
 * @param recipientUserId
 * @returns True if the operation was successful
 */
export async function unMuteUserById(userId: number, recipientUserId: number): Promise<boolean> {
    await prisma.muted_users.deleteMany({
        where: {
            user_id: BigInt(userId),
            recipient_id: BigInt(recipientUserId)
        }
    });

    return true;
}

/**
 * Returns the full user profile.
 * @param userId
 * @param currentUserId
 */
export async function getFullUserProfile(userId: number, currentUserId: number) {
    const user = await getUser(Number(userId));
    if (!user) {
        return {error: 'This user account cannot be found.', statusCode: 404};
    }

    if (user.suspended_at) {
        return {error: 'This user has been suspended.', statusCode: 400};
    }

    const isBlocked = await isUserBlocked(userId, currentUserId);
    if (isBlocked) {
        return {error: 'You have been blocked by this user.', statusCode: 403};
    }

    const userProfileDetails = await getUserProfileDetail(currentUserId, prepareUser(user));
    return {statusCode: 200, userProfileDetails};
}


