'use server';

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { checkUserExists, hashPassword, sendVerificationEmailToUser } from '@/server-side-helpers/user.helpers';
import { UserRegistrationData, ValidationErrors, User, SearchFromOrigin } from '@/types';
import { prismaWrite } from '@/lib/prisma';
import { pgDbReadPool, pgDbWritePool } from '@/lib/postgres';
import { createSession } from '@/server-side-helpers/session.helpers';
import { businessConfig } from "@/config/business";
import { logError } from '@/server-side-helpers/logging.helpers';
import { trackCompleteRegistration } from '@/server-side-helpers/ad-platform-conversion.helpers';
import * as Sentry from "@sentry/nextjs";

interface RegistrationResult {
    success: boolean;
    message?: string;
    errors?: ValidationErrors;
}

/**
 * Extract client IP address from request headers
 */
function getClientIp(headersList: Headers): string | undefined {
    // Check various headers in order of preference
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, get the first one
        return forwardedFor.split(',')[0].trim();
    }

    return headersList.get('x-real-ip') ||
        headersList.get('cf-connecting-ip') || // Cloudflare
        headersList.get('x-client-ip') ||
        undefined;
}

/**
 * Server action to handle user registration
 */
export async function registerAction(formData: FormData): Promise<RegistrationResult> {
    try {
        const cookieConsent = formData.get('cookieConsent') as string;
        const authMethod = formData.get('authMethod') as string || 'email';
        const googleId = formData.get('googleId') as string || undefined;

        // Check if user has declined cookie consent
        const cookieConsentDeclined = cookieConsent === 'declined';

        // Extract user data from form data
        const userData: UserRegistrationData = {
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            dateOfBirth: formData.get('dateOfBirth') as string,
            location: JSON.parse(formData.get('location') as string),
            userGender: formData.get('userGender') as string,
            seekingGender: formData.get('seekingGender') as string,
            country: formData.get('country') as string,
            termsAccepted: formData.get('termsAccepted') === 'true',
            timezone: formData.get('timezone') as string
        };

        // Validate user data
        const errors = await validateUserData(userData, authMethod === 'google');

        // If there are validation errors, return them
        if (Object.keys(errors).length > 0) {
            return {
                success: false,
                message: 'Validation failed',
                errors
            };
        }

        // For Google OAuth, generate a random password since they won't use it
        const passwordToHash = authMethod === 'google'
            ? require('crypto').randomBytes(32).toString('hex')
            : userData.password;

        let emailVerifiedAt = undefined;
        if ((process.env.AUTO_EMAIL_VERIFY || '').toLowerCase() === 'true' || authMethod === 'google') {
            emailVerifiedAt = new Date();
        }

        // Prepare user data for database storage
        const createData = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email.toLowerCase(),
            password: await hashPassword(passwordToHash),
            displayName: `${userData.firstName} ${userData.lastName[0]}.`,
            dateOfBirth: new Date(userData.dateOfBirth),
            gender: userData.userGender,
            timezone: userData.timezone,
            createdAt: new Date(),
            seekingGender: userData.seekingGender,
            seekingNumOfPhotos: businessConfig.defaults.numOfPhotos,
            seekingMaxDistance: businessConfig.defaults.maxDistance,
            seekingMinHeight: businessConfig.defaults.minHeight,
            seekingDistanceOrigin: SearchFromOrigin.AllLocations,
            seekingMaxHeight: businessConfig.defaults.maxHeight,
            seekingMinAge: businessConfig.defaults.minAge,
            seekingMaxAge: businessConfig.defaults.maxAge,
            maritalStatus: businessConfig.defaults.maritalStatus,
            latitude: userData.location.coordinates?.latitude ?? null,
            longitude: userData.location.coordinates?.longitude ?? null,
            locationName: userData.location.name,
            locationViewport: userData.location.viewport,
            emailVerifiedAt: emailVerifiedAt,
            country: userData.country,
            height: businessConfig.defaults.minHeight,
            updatedAt: new Date(),
            lastActiveAt: new Date(),
            googleId: googleId || null,
        };

        // Store user in the database with geoPoint
        const newUserResult = await prismaWrite.$queryRaw<{ id: number }[]>`
            INSERT INTO users ("firstName", "lastName", "email", "password", "displayName", "dateOfBirth",
                               "gender", "timezone", "createdAt", "seekingGender", "seekingNumOfPhotos",
                               "seekingMaxDistance", "seekingMinHeight", "seekingDistanceOrigin",
                               "seekingMaxHeight", "seekingMinAge", "seekingMaxAge", "maritalStatus",
                               "latitude", "longitude", "locationName", "locationViewport", "country",
                               "height", "updatedAt", "lastActiveAt", "googleId", "emailVerifiedAt", "geoPoint")
            VALUES (${createData.firstName}, ${createData.lastName}, ${createData.email},
                    ${createData.password}, ${createData.displayName}, ${createData.dateOfBirth},
                    ${createData.gender}, ${createData.timezone}, ${createData.createdAt},
                    ${createData.seekingGender}, ${createData.seekingNumOfPhotos},
                    ${createData.seekingMaxDistance}, ${createData.seekingMinHeight},
                    ${createData.seekingDistanceOrigin}, ${createData.seekingMaxHeight},
                    ${createData.seekingMinAge}, ${createData.seekingMaxAge}, ${createData.maritalStatus},
                    ${createData.latitude}, ${createData.longitude}, ${createData.locationName},
                    ${createData.locationViewport ? JSON.stringify(createData.locationViewport) : null}::jsonb,
                    ${createData.country}, ${createData.height}, ${createData.updatedAt},
                    ${createData.lastActiveAt}, ${createData.googleId}, ${createData.emailVerifiedAt},
                    ST_SetSRID(ST_MakePoint(${createData.longitude}, ${createData.latitude}), 4326)) RETURNING id
        `;

        const newUser = {id: newUserResult[0].id, ...createData};

        // Store browser data
        await prismaWrite.userBrowsers.create({
            data: {
                userId: newUser.id,
                fingerprintId: formData.get('browserFingerprint') as string,
                count: 1,
                userAgent: formData.get('browserUserAgent') as string,
                cookies: !cookieConsentDeclined ? formData.get('browserCookies') as string : null
            }
        });

        // Send verification email
        if (!emailVerifiedAt) {
            await sendVerificationEmailToUser(newUser.id, createData.email, createData.firstName, createData.lastName);
        }

        // Auto-enroll in premium during launch (feature-flagged)
        try {
            if (process.env.AUTO_ENROLL_PREMIUM === 'true') {
                let premiumPlanId: number | null = null;
                const envPlanIdStr = process.env.PREMIUM_PLAN_ID;
                if (envPlanIdStr) {
                    const parsed = parseInt(envPlanIdStr, 10);
                    if (!Number.isNaN(parsed)) {
                        premiumPlanId = parsed;
                    }
                }

                if (!premiumPlanId) {
                    const {rows: planRows} = await pgDbReadPool.query(
                        `SELECT id
                         FROM "subscriptionPlans"
                         WHERE LOWER(name) LIKE '%premium%'
                         ORDER BY "listPrice" DESC LIMIT 1`
                    );
                    if (planRows.length > 0) {
                        premiumPlanId = planRows[0].id;
                    }
                }

                if (premiumPlanId) {
                    const {rows: activeRows} = await pgDbReadPool.query(
                        `SELECT id
                         FROM "subscriptionPlanEnrollments"
                         WHERE "userId" = $1
                           AND ("endsAt" IS NULL OR "endsAt" > NOW()) LIMIT 1`,
                        [newUser.id]
                    );

                    if (activeRows.length === 0) {
                        const startDate = new Date();
                        const farFuture = new Date('2500-01-01T00:00:00.000Z');

                        // Create lifetime enrollment (no end, next payment set far in the future)
                        await pgDbWritePool.query(
                            `INSERT INTO "subscriptionPlanEnrollments" ("userId", "subscriptionPlanId", "startedAt",
                                                                        "lastPaymentAt", "nextPaymentAt",
                                                                        "price", "chargeInterval", "priceUnit",
                                                                        "createdAt", "updatedAt", "lastEvalAt",
                                                                        "endsAt")
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                            [
                                newUser.id,
                                premiumPlanId,
                                startDate,
                                startDate,
                                farFuture, // next payment scheduled far in the future
                                0,
                                'monthly',
                                'USD',
                                startDate,
                                startDate,
                                startDate,
                                null
                            ]
                        );

                        await pgDbWritePool.query(
                            `UPDATE "users"
                             SET "isPremium" = true,
                                 "isFoundingMember" = true,
                                 "updatedAt" = NOW()
                             WHERE id = $1`,
                            [newUser.id]
                        );
                    }
                }
            }
        } catch (autoEnrollErr) {
            const errMsg = 'Auto-enroll premium failed:';
            console.error(errMsg, autoEnrollErr);
            Sentry.logger.error(errMsg, {error: autoEnrollErr});
        }

        // Create a session for the user
        const sessionId = await createSession(newUser as unknown as User);

        // Set the session cookie
        if (sessionId) {
            const cookieStore = await cookies();
            const cookieOptions: any = {
                name: process.env.SESSION_COOKIE_NAME as string,
                value: sessionId,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            };

            // If user declined cookies, make it session-only (expires when browser closes)
            // Otherwise, set maxAge for persistent storage
            if (!cookieConsentDeclined) {
                cookieOptions.maxAge = parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60;
            }

            cookieStore.set(cookieOptions);
        }

        // Track Meta Conversion API event for lead/registration
        try {
            // Parse browser cookies to extract Facebook pixel cookies
            const browserCookies = formData.get('browserCookies') as string || '';
            const cookieMap = new Map<string, string>();

            if (browserCookies) {
                browserCookies.split(';').forEach(cookie => {
                    const [key, value] = cookie.trim().split('=');
                    if (key && value) {
                        cookieMap.set(key, value);
                    }
                });
            }

            // Get client IP address from request headers
            const headersList = await headers();
            const clientIp = getClientIp(headersList);

            // Get event ID for deduplication with Meta Pixel
            const metaEventId = formData.get('metaEventId') as string || undefined;

            await trackCompleteRegistration({
                email: createData.email,
                firstName: createData.firstName,
                lastName: createData.lastName,
                country: createData.country,
                externalId: newUser.id.toString(),
                clientIpAddress: clientIp,
                clientUserAgent: formData.get('browserUserAgent') as string || undefined,
                fbp: cookieMap.get('_fbp'),
                fbc: cookieMap.get('_fbc')
            }, process.env.NEXT_PUBLIC_BASE_URL + '/registration', metaEventId);
        } catch (metaError) {
            // Don't fail registration if Meta tracking fails
            console.error('Meta Conversion API tracking failed:', metaError);
            Sentry.captureException(metaError, {
                tags: {
                    integration: 'meta_conversion_api',
                    event: 'registration'
                }
            });
        }

        return {
            success: true,
            message: 'Registration successful'
        };
    } catch (error: any) {
        logError(error, 'Registration failed');

        return {
            success: false,
            message: 'Registration failed. Please try again later.'
        };
    }
}

/**
 * Validate user registration data
 * @param data
 * @returns
 */
async function validateUserData(data: UserRegistrationData, isGoogleSignup: boolean = false): Promise<ValidationErrors> {
    const errors: ValidationErrors = {};

    // Validate first name (only letters including accented chars, not empty)
    if (!data.firstName || !data.firstName.trim()) {
        errors.firstName = 'First name is required';
    } else if (!/^[\p{L}\s'-]+$/u.test(data.firstName.trim())) {
        errors.firstName = 'First name must only contain letters';
    }

    // Validate last name (only letters including accented chars, not empty)
    if (!data.lastName || !data.lastName.trim()) {
        errors.lastName = 'Last name is required';
    } else if (!/^[\p{L}\s'-]+$/u.test(data.lastName.trim())) {
        errors.lastName = 'Last name must only contain letters';
    }

    // Validate email (valid format, not already in use)
    if (!data.email || !data.email.trim()) {
        errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
        errors.email = 'Email is invalid';
    } else {
        // Check if email is already in use
        const emailExists = await checkUserExists(data.email);
        if (emailExists) {
            errors.email = 'A user with this email already exists';
        }
    }

    // Validate password (only for non-Google signups)
    if (!isGoogleSignup) {
        if (!data.password) {
            errors.password = 'Password is required';
        } else if (data.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
            errors.password = 'Password must contain at least one special character';
        }
    }

    // Validate date of birth (valid date, at least 18 years old)
    if (!data.dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required';
    } else {
        try {
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
        } catch {
            errors.dateOfBirth = 'Invalid date of birth';
        }
    }

    // Validate gender selection
    if (!data.userGender) {
        errors.userGender = 'Please select your gender';
    }

    // Validate seeking gender selection
    if (!data.seekingGender) {
        errors.seekingGender = 'Please select who you are looking for';
    }

    // Validate location
    if (!data.location) {
        errors.location = 'Please search and select your location';
    }

    // Validate terms acceptance
    if (!data.termsAccepted) {
        errors.terms = 'You must accept the terms of service';
    }

    return errors;
}
