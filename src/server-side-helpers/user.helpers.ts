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
import { indexUserForSearch } from "@/server-side-helpers/search.helpers";

/**
 * Get a user by their ID
 * @param id The user's ID
 * @returns The user object without the password or null if not found
 */
export async function getUser(id: number): Promise<Omit<User, 'password'> | null> {
  const user = await prisma.users.findUnique({
    where: {
      id: BigInt(id)
    }
  });

  if (!user) {
    return null;
  }

  // Create a new object without the password field
  const userWithoutPassword = { ...user } as Omit<typeof user, 'password'>;
  delete (userWithoutPassword as Record<string, unknown>).password;
  return userWithoutPassword as unknown as Omit<User, 'password'>;
}

/**
 * Refresh the last active on the user.
 * @param user
 */
async function refreshLastActive(user: User) {
  await prisma.users.update({
    where: { id: user.id },
    data: { last_active_at: new Date() }
  });
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
 * Get the currently logged-in user based on the session ID in cookies
 * @param request Optional NextRequest object for server components
 * @param response Optional NextResponse to rotate the session if needed
 * @returns The current user without password or null if not authenticated
 */
export async function getCurrentUser(
  request?: NextRequest,
  response?: NextResponse
): Promise<User | undefined> {
  const sessionId = await getSessionId(request);

  if (!sessionId) {
    return undefined;
  }

  // Get session data from Redis
  const sessionData = await getSessionData(sessionId);

  if (!sessionData) {
    return undefined;
  }

  // Rotate session if needed and if response object is provided
  if (response) {
    await rotateSession(sessionId, response);
  }

  // Get the user from the database
  const result = await prisma.users.findUnique({
    where: {
      id: BigInt(sessionData.userId)
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
  await refreshLastActive(user as unknown as User);

  await indexUserForSearch(user);

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
export function checkSubscriptionActive(user: User): boolean {
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
 * @param request Optional NextRequest object to get the session ID from
 * @param response Optional NextResponse to clear the session cookie
 * @returns True if logout was successful, false otherwise
 */
export async function logoutUser(
  request?: NextRequest,
  response?: NextResponse
): Promise<void> {

  const sessionId = await getSessionId(request);
  if (!sessionId) {
    return;
  }

  await deleteSession(sessionId, response);
}

/**
 * Calculate a user's age
 * @param { date_of_birth }
 * @returns number
 */
export function calculateUserAge({ date_of_birth }: { date_of_birth: Date | string }) {
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
  user.password = ''
  user.age = calculateUserAge(user);

  user.is_subscription_active = checkSubscriptionActive(user);

  if (user.main_photo && user.photos) {
    user.public_main_photo = appendMediaRootToImageUrl(user.main_photo);
    user.main_photo_cropped_image_data = getMainCroppedImageData(user)
  }

  if (user.photos && user.photos.length) {
    user.public_photos = user.photos.map(p => appendMediaRootToImage(p));
  }

  return user;
}
