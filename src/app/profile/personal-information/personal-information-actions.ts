'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Locality } from "@/types/locality.interface";

interface PersonalInformationData {
    displayName: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    bio: string;
    location?: Locality;
    userGender: string;
    seekingGender: string;
    height?: number;
    bodyType: string;
    ethnicities: string[];
    religions: string[];
    education: string;
    languages: string[];
    maritalStatus: string;
    hasChildren: string;
    wantsChildren: string;
    drinking: string;
    smoking: string;
    interests: string[];
}

/**
 * Update personal information.
 * @param data
 */
export async function updatePersonalInformation(data: PersonalInformationData) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Validate required fields
        const errors: Record<string, string> = {};

        if (!data.displayName.trim()) {
            errors.displayName = 'Display name is required';
        }

        if (!data.firstName.trim()) {
            errors.firstName = 'First name is required';
        }

        if (!data.lastName.trim()) {
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
        if (data.ethnicities.length > 3) {
            errors.ethnicities = 'You can select up to 3 ethnicities';
        }

        if (data.religions.length > 3) {
            errors.religions = 'You can select up to 3 religions';
        }

        if (data.languages.length > 3) {
            errors.languages = 'You can select up to 3 languages';
        }

        if (data.interests.length > 7) {
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
            ethnicities: data.ethnicities.length > 0 ? data.ethnicities : null,
            religions: data.religions.length > 0 ? data.religions : null,
            education: data.education || null,
            languages: data.languages.length > 0 ? data.languages : null,
            maritalStatus: data.maritalStatus || null,
            hasChildren: data.hasChildren || null,
            wantsChildren: data.wantsChildren || null,
            drinking: data.drinking || null,
            smoking: data.smoking || null,
            interests: data.interests.length > 0 ? data.interests : null,
            updatedAt: new Date()
        };

        // Add location data if provided
        if (data.location && data.location.coordinates) {
            updateData.locationName = data.location.name;
            updateData.latitude = data.location.coordinates.latitude;
            updateData.longitude = data.location.coordinates.longitude;
            updateData.country = data.location.country;
            updateData.locationViewport = data.location.viewport || null;
        }

        // Update the user in the database
        if (data.location && data.location.coordinates) {
            // Update with geoPoint using raw SQL for PostGIS functionality
            await prisma.$executeRaw`
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
                    "updatedAt" = ${updateData.updatedAt}
                WHERE "id" = ${currentUser.id}
            `;
        } else {
            // Update without geoPoint changes
            await prisma.users.update({
                where: { id: currentUser.id },
                data: updateData
            });
        }

        // Revalidate relevant paths
        revalidatePath('/profile/personal-information');
        revalidatePath('/profile');

        return { success: true };
    } catch (error) {
        console.error('Personal information update error:', error);
        return { success: false, error: "Failed to update profile. Please try again." };
    }
}
