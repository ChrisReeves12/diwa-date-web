import { NextRequest, NextResponse } from 'next/server';
import { prismaWrite } from '@/lib/prisma';
import { hashPassword, checkUserExists } from '@/server-side-helpers/user.helpers';
import { SearchFromOrigin } from '@/types';
import { businessConfig } from '@/config/business';

export async function POST(request: NextRequest) {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    try {
        // Test user data as specified
        const testUserData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'johndoe@test.com',
            password: 'Password1!',
            dateOfBirth: '1990-01-15', // Make him 33+ years old
            userGender: 'male',
            seekingGender: 'female',
            termsAccepted: true,
            timezone: 'America/Los_Angeles',
            location: {
                name: 'Torrance, CA, USA',
                coordinates: {
                    latitude: 33.8358,
                    longitude: -118.3406
                },
                city: 'Torrance',
                region: 'California',
                country: 'United States',
                viewport: {
                    high: {
                        latitude: 33.8458,
                        longitude: -118.3306
                    },
                    low: {
                        latitude: 33.8258,
                        longitude: -118.3506
                    }
                }
            }
        };

        // Check if user already exists
        const emailExists = await checkUserExists(testUserData.email);
        if (emailExists) {
            return NextResponse.json({
                error: 'User already exists',
                message: `Test user with email ${testUserData.email} already exists`
            }, { status: 400 });
        }

        // Prepare user data for database storage (following registration-form-actions.ts structure)
        const createData = {
            firstName: testUserData.firstName,
            lastName: testUserData.lastName,
            email: testUserData.email.toLowerCase(),
            password: await hashPassword(testUserData.password),
            displayName: `${testUserData.firstName} ${testUserData.lastName[0]}.`, // "John D."
            dateOfBirth: new Date(testUserData.dateOfBirth),
            gender: testUserData.userGender,
            timezone: testUserData.timezone,
            createdAt: new Date(),
            seekingGender: testUserData.seekingGender,
            seekingNumOfPhotos: businessConfig.defaults.numOfPhotos,
            seekingMaxDistance: businessConfig.defaults.maxDistance,
            seekingMinHeight: businessConfig.defaults.minHeight,
            seekingDistanceOrigin: SearchFromOrigin.CurrentLocation,
            seekingMaxHeight: businessConfig.defaults.maxHeight,
            seekingMinAge: businessConfig.defaults.minAge,
            seekingMaxAge: businessConfig.defaults.maxAge,
            maritalStatus: businessConfig.defaults.maritalStatus,
            latitude: testUserData.location.coordinates?.latitude ?? null,
            longitude: testUserData.location.coordinates?.longitude ?? null,
            locationName: testUserData.location.name,
            locationViewport: testUserData.location.viewport,
            country: testUserData.location.country,
            height: businessConfig.defaults.minHeight,
            updatedAt: new Date(),
            lastActiveAt: new Date()
        };

        // Create user in database
        const newUser = await prismaWrite.users.create({
            data: createData as never
        });

        return NextResponse.json({
            success: true,
            message: `Test user created successfully`,
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                displayName: newUser.displayName
            }
        });

    } catch (error) {
        console.error('Test user creation error:', error);
        return NextResponse.json({
            error: 'User creation failed',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
} 