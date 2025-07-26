'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Locality } from "@/types/locality.interface";
import { updatePersonalInformationForUser } from "@/server-side-helpers/user.helpers";

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

    // Call the helper to perform validation and update
    const result = await updatePersonalInformationForUser(currentUser, data);

    // If successful, revalidate relevant paths
    if (result.success) {
        revalidatePath('/profile/personal-information');
        revalidatePath('/profile');
    }

    return result;
}
