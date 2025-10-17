'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser, sendVerificationEmailToUser } from '@/server-side-helpers/user.helpers';
import { WizardData } from './wizard-container';
import { prismaWrite } from '@/lib/prisma';
import { pgDbWritePool } from '@/lib/postgres';

export async function saveWizardProgress(data: Partial<WizardData>) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        return { success: false, message: 'User not authenticated' };
    }

    try {
        // Update user with wizard progress
        await prismaWrite.users.update({
            where: { id: currentUser.id },
            data: {
                displayName: data.displayName || undefined,
                height: data.height ? parseInt(data.height) : undefined,
                bodyType: data.bodyType || undefined,
                ethnicities: data.ethnicities || undefined,
                religions: data.religions || undefined,
                education: data.education || undefined,
                languages: data.languages || undefined,
                maritalStatus: data.maritalStatus || undefined,
                hasChildren: data.hasChildren || undefined,
                wantsChildren: data.wantsChildren || undefined,
                drinking: data.drinking || undefined,
                smoking: data.smoking || undefined,
                interests: data.interests || undefined,
                bio: data.bio || undefined,
                updatedAt: new Date()
            }
        });

        return { success: true, message: 'Progress saved successfully' };
    } catch (error) {
        return { success: false, message: 'Failed to save progress' };
    }
}

export async function updateOnboardingProgress(currentStep: number, completedSteps: number[]) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        return { success: false, message: 'User not authenticated' };
    }

    try {
        const onboardingSteps = {
            currentStep,
            completedSteps,
            lastUpdated: new Date().toISOString()
        };

        // Use raw SQL to update the currentOnboardingSteps field
        await pgDbWritePool.query(
            'UPDATE users SET "currentOnboardingSteps" = $1, "updatedAt" = NOW() WHERE id = $2',
            [JSON.stringify(onboardingSteps), currentUser.id]
        );

        return { success: true, message: 'Onboarding progress updated' };
    } catch (error) {
        return { success: false, message: 'Failed to update progress' };
    }
}

export async function completeWizard(data: WizardData) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        return { success: false, message: 'User not authenticated' };
    }

    try {
        // Validate required fields
        if (!data.displayName?.trim()) {
            return { success: false, message: 'Display name is required' };
        }

        if (data.displayName.trim().length > 20) {
            return { success: false, message: 'Display name cannot be longer than 20 characters' };
        }

        // Update user with complete wizard data and mark profile as complete
        await prismaWrite.users.update({
            where: { id: currentUser.id },
            data: {
                displayName: data.displayName,
                height: data.height ? parseInt(data.height) : null,
                bodyType: data.bodyType || null,
                ethnicities: data.ethnicities || [],
                religions: data.religions || [],
                education: data.education || null,
                languages: data.languages || [],
                maritalStatus: data.maritalStatus || null,
                hasChildren: data.hasChildren || null,
                wantsChildren: data.wantsChildren || null,
                drinking: data.drinking || null,
                smoking: data.smoking || null,
                interests: data.interests || [],
                bio: data.bio || null,
                profileCompletedAt: new Date(),
                updatedAt: new Date()
            }
        });

        // Clear onboarding progress since wizard is complete
        await pgDbWritePool.query(
            'UPDATE users SET "currentOnboardingSteps" = NULL WHERE id = $1',
            [currentUser.id]
        );

        return { success: true, message: 'Profile completed successfully' };
    } catch (error) {
        return { success: false, message: 'Failed to complete profile' };
    }
}

export async function exitWizard() {
    // Just redirect to home page
    redirect('/');
}

export async function resendVerificationEmail() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        return { success: false, message: 'User not authenticated' };
    }

    if (currentUser.emailVerifiedAt) {
        return { success: false, message: 'Email is already verified' };
    }

    try {
        const emailSent = await sendVerificationEmailToUser(
            currentUser.id,
            currentUser.email,
            currentUser.firstName,
            currentUser.lastName
        );

        if (emailSent) {
            return { success: true, message: 'Verification email sent successfully' };
        } else {
            return { success: false, message: 'Failed to send verification email' };
        }
    } catch (error) {
        return { success: false, message: 'An error occurred while sending the email' };
    }
} 