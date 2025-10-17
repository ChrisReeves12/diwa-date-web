import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { WizardData } from '../wizard-container';
import { saveWizardProgress, completeWizard, exitWizard, updateOnboardingProgress } from '../wizard-actions';

interface WizardNavigationProps {
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    wizardData: WizardData;
    isCurrentStepValid: boolean;
    stepValidation: Record<number, boolean>;
}

export function WizardNavigation({
    currentStep,
    totalSteps,
    onNext,
    onPrev,
    wizardData,
    isCurrentStepValid,
    stepValidation
}: WizardNavigationProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCompleteLater = async () => {
        setIsSubmitting(true);
        try {
            // Save form data first
            await saveWizardProgress(wizardData);

            // Save onboarding progress
            const completedSteps = Object.keys(stepValidation)
                .filter(stepNum => stepValidation[parseInt(stepNum)])
                .map(stepNum => parseInt(stepNum));

            await updateOnboardingProgress(currentStep, completedSteps);

            // Redirect to home
            router.push('/');
        } catch (error) {
            router.push('/');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === totalSteps) {
            setIsSubmitting(true);
            try {
                const result = await completeWizard(wizardData);
                if (result.success) {
                    router.push('/');
                } else {
                    // Could show error message to user here
                }
            } catch (error) {
            } finally {
                setIsSubmitting(false);
            }
        } else {
            onNext();
        }
    };

    const isFirstStep = currentStep === 1;
    const isLastStep = currentStep === totalSteps;
    // Email verification step (step 1) can always be skipped
    const canProceed = currentStep === 1 || isCurrentStepValid;

    return (
        <div className="wizard-navigation">
            <div className="nav-buttons">
                <button
                    type="button"
                    onClick={handleCompleteLater}
                    className="btn-secondary complete-later-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : 'Complete Later'}
                </button>

                <div className="nav-controls">
                    {!isFirstStep && (
                        <button
                            type="button"
                            onClick={onPrev}
                            className="btn-secondary back-btn"
                            disabled={isSubmitting}
                        >
                            Back
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleNext}
                        className="btn-primary next-btn"
                        disabled={isSubmitting || !canProceed}
                        title={!canProceed ? 'Please complete all required fields to continue' : ''}
                    >
                        {isSubmitting ? 'Saving...' : (isLastStep ? 'Complete Profile' : 'Next')}
                    </button>
                </div>
            </div>
        </div>
    );
} 