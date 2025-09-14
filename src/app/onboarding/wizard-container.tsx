'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/user.interface';
import { WizardProgress } from '@/app/onboarding/components/wizard-progress';
import { WizardNavigation } from '@/app/onboarding/components/wizard-navigation';
import { WelcomeStep } from '@/app/onboarding/steps/welcome-step';
import { AppearanceStep } from '@/app/onboarding/steps/appearance-step';
import { CultureStep } from '@/app/onboarding/steps/culture-step';
import { LifestyleStep } from '@/app/onboarding/steps/lifestyle-step';
import { InterestsStep } from '@/app/onboarding/steps/interests-step';
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
    for (let i = 1; i <= 5; i++) {
        validation[i] = false;
    }

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
    const [showResumeNotice, setShowResumeNotice] = useState(startingStep > 1);
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

    const totalSteps = 5;

    // Auto-hide resume notice after 8 seconds
    useEffect(() => {
        if (showResumeNotice) {
            const timer = setTimeout(() => {
                setShowResumeNotice(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [showResumeNotice]);

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
                return <WelcomeStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(1, isValid)}
                />;
            case 2:
                return <AppearanceStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(2, isValid)}
                />;
            case 3:
                return <CultureStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(3, isValid)}
                />;
            case 4:
                return <LifestyleStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(4, isValid)}
                />;
            case 5:
                return <InterestsStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(5, isValid)}
                />;
            default:
                return <WelcomeStep
                    data={wizardData}
                    updateData={updateWizardData}
                    onValidationChange={(isValid) => updateStepValidation(1, isValid)}
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

                {showResumeNotice && (
                    <div className="resume-notice">
                        <div className="resume-icon">🔄</div>
                        <div className="resume-text">
                            Resuming from where you left off. You can navigate back to previous steps if needed.
                        </div>
                        <button
                            onClick={() => setShowResumeNotice(false)}
                            className="resume-close-btn"
                            aria-label="Close notification"
                        >
                            ×
                        </button>
                    </div>
                )}

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