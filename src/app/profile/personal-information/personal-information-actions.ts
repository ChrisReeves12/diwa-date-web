'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Locality } from "@/types/locality.interface";
import { updatePersonalInformationForUser } from "@/server-side-helpers/user.helpers";
import { prismaWrite } from "@/lib/prisma";

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

    // Check if bio was added or updated
    const previousBio = currentUser.bio || '';
    const newBio = data.bio || '';
    const bioWasUpdated = previousBio !== newBio && newBio.trim().length > 0;

    // Call the helper to perform validation and update
    const result = await updatePersonalInformationForUser(currentUser, data);

    // If successful, revalidate relevant paths and add to content review queue if bio was updated
    if (result.success) {
        revalidatePath('/profile/personal-information');
        revalidatePath('/profile');

        // Add to content review queue if bio was added or updated
        if (bioWasUpdated) {
            await prismaWrite.userReviews.upsert({
                where: { userId: currentUser.id },
                update: {
                    reviewType: 'content',
                    updatedAt: new Date()
                },
                create: {
                    userId: currentUser.id,
                    reviewType: 'content',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }
    }

    return result;
}
