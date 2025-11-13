'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/user.interface';
import { WizardProgress } from '@/app/onboarding/components/wizard-progress';
import { WizardNavigation } from '@/app/onboarding/components/wizard-navigation';
import { EmailVerificationStep } from '@/app/onboarding/steps/email-verification-step';
import { WelcomeStep } from '@/app/onboarding/steps/welcome-step';
import { AppearanceStep } from '@/app/onboarding/steps/appearance-step';
import { CultureStep } from '@/app/onboarding/steps/culture-step';
import { LifestyleStep } from '@/app/onboarding/steps/lifestyle-step';
import { InterestsStep } from '@/app/onboarding/steps/interests-step';
import { PhotosStep } from '@/app/onboarding/steps/photos-step';
import './onboarding.scss';

interface WizardContainerProps {
    currentUser: User;
}

export interface WizardData {
    displayName: string;
    height: string;
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
    bio: string;
}

// Function to determine which step the user should start on based on currentOnboardingSteps
const determineStartingStep = (user: User): number => {

    // Handle case where currentOnboardingSteps might be a string that needs parsing
    let onboardingSteps = user.currentOnboardingSteps;
    if (typeof onboardingSteps === 'string') {
        try {
            onboardingSteps = JSON.parse(onboardingSteps);
        } catch (e) {
            onboardingSteps = undefined;
        }
    }

    if (onboardingSteps?.currentStep) {
        return onboardingSteps.currentStep;
    }

    // Default to step 1 if no onboarding progress is saved
    return 1;
};

// Function to initialize validation state based on completed steps
const initializeValidationState = (user: User): Record<number, boolean> => {

    const validation: Record<number, boolean> = {};

    // Initialize all steps as invalid by default
    for (let i = 1; i <= 7; i++) {
        validation[i] = false;
    }

    // Step 1 (email verification) is always valid - users can skip it
    // Mark as completed if email is verified
    validation[1] = user.emailVerifiedAt !== null;

    // Handle case where currentOnboardingSteps might be a string that needs parsing
    let onboardingSteps = user.currentOnboardingSteps;
    if (typeof onboardingSteps === 'string') {
        try {
            onboardingSteps = JSON.parse(onboardingSteps);
        } catch (e) {
            onboardingSteps = undefined;
        }
    }

    // Mark completed steps as valid based on currentOnboardingSteps
    if (onboardingSteps?.completedSteps) {
        onboardingSteps.completedSteps.forEach(step => {
            validation[step] = true;
        });
    }

    return validation;
};

export function WizardContainer({ currentUser }: WizardContainerProps) {
    const startingStep = determineStartingStep(currentUser);
    const [currentStep, setCurrentStep] = useState(startingStep);
    const [stepValidation, setStepValidation] = useState<Record<number, boolean>>(
        initializeValidationState(currentUser)
    );
    const [showResumeNotice, setShowResumeNotice] = useState(false);
    const [wizardData, setWizardData] = useState<WizardData>({
        displayName: currentUser.displayName || '',
        height: currentUser.height?.toString() || '',
        bodyType: currentUser.bodyType || '',
        ethnicities: currentUser.ethnicities || [],
        religions: currentUser.religions || [],
        education: currentUser.education || '',
        languages: currentUser.languages || [],
        maritalStatus: currentUser.maritalStatus || '',
        hasChildren: currentUser.hasChildren || '',
        wantsChildren: currentUser.wantsChildren || '',
        drinking: currentUser.drinking || '',
        smoking: currentUser.smoking || '',
        interests: currentUser.interests || [],
        bio: currentUser.bio || ''
    });

    const totalSteps = 7;

    const updateWizardData = (field: keyof WizardData, value: any) => {
        setWizardData(prev => ({ ...prev, [field]: value }));
    };

    const updateStepValidation = (step: number, isValid: boolean) => {
        setStepValidation(prev => {
            const newValidation = { ...prev, [step]: isValid };

            // If step becomes valid and wasn't already completed, save progress
            if (isValid && !prev[step]) {
                const completedSteps = Object.keys(newValidation)
                    .filter(stepNum => newValidation[parseInt(stepNum)])
                    .map(stepNum => parseInt(stepNum));

                // Save progress asynchronously
                import('./wizard-actions').then(actions => {
                    actions.updateOnboardingProgress(currentStep, completedSteps);
                });
            }

            return newValidation;
        });
    };

    const nextStep = () => {
        if (currentStep < totalSteps && stepValidation[currentStep]) {
            const nextStepNum = currentStep + 1;
            setCurrentStep(nextStepNum);

            // Save current step progress
            const completedSteps = Object.keys(stepValidation)
                .filter(stepNum => stepValidation[parseInt(stepNum)])
                .map(stepNum => parseInt(stepNum));

            import('./wizard-actions').then(actions => {
                actions.updateOnboardingProgress(nextStepNum, completedSteps);
            });
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const goToStep = (step: number) => {
        // Allow navigation to any step that's completed or the next step after the last completed one
        if (step <= currentStep || stepValidation[step - 1]) {
            setCurrentStep(step);
        }
    };

    const isCurrentStepValid = stepValidation[currentStep] || false;

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return <EmailVerificationStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(1, isValid)}
                    userEmail={currentUser.email}
                    emailVerified={currentUser.emailVerifiedAt !== null}
                />;
            case 2:
                return <WelcomeStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(2, isValid)}
                />;
            case 3:
                return <PhotosStep
                    currentUser={currentUser}
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(3, isValid)}
                />;
            case 4:
                return <AppearanceStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(4, isValid)}
                />;
            case 5:
                return <CultureStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(5, isValid)}
                />;
            case 6:
                return <LifestyleStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(6, isValid)}
                />;
            case 7:
                return <InterestsStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(7, isValid)}
                />;
            default:
                return <EmailVerificationStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(1, isValid)}
                    userEmail={currentUser.email}
                    emailVerified={currentUser.emailVerifiedAt !== null}
                />;
        }
    };

    return (
        <div className="wizard-container">
            <div className="wizard-content">
                <WizardProgress
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    completedSteps={stepValidation}
                />

                <div className="wizard-step-content">
                    {renderCurrentStep()}
                </div>

                <WizardNavigation
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    onNext={nextStep}
                    onPrev={prevStep}
                    wizardData={wizardData}
                    isCurrentStepValid={isCurrentStepValid}
                    stepValidation={stepValidation}
                />
            </div>
        </div>
    );
}
