import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { WizardContainer } from '@/app/onboarding/wizard-container';

export default async function OnboardingPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/onboarding');
    }

    // If user already completed onboarding, redirect to home
    if (currentUser.profileCompletedAt) {
        redirect('/');
    }

    return <WizardContainer currentUser={currentUser} />;
} 