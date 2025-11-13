interface WizardProgressProps {
    currentStep: number;
    totalSteps: number;
    completedSteps: Record<number, boolean>;
}

export function WizardProgress({ currentStep, totalSteps, completedSteps }: WizardProgressProps) {
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    const getStepStatus = (step: number) => {
        if (step === currentStep) return 'active';
        if (completedSteps[step]) return 'completed';
        return 'pending';
    };

    return (
        <div className="wizard-progress">
            <div className="progress-steps">
                {steps.map((step) => (
                    <div
                        key={step}
                        className={`progress-step ${getStepStatus(step)}`}
                    >
                        <div className="step-number">{step}</div>
                        {step < totalSteps && (
                            <div
                                className={`step-connector ${completedSteps[step] && completedSteps[step + 1] ? 'completed' : ''
                                    }`}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="progress-text">
                Step {currentStep} of {totalSteps}
            </div>
        </div>
    );
} 