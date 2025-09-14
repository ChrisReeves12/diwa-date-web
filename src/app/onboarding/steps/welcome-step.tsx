import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { InfoCircleIcon, InfoIcon } from 'react-line-awesome';
import Image from 'next/image';

interface WelcomeStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
}

export function WelcomeStep({ data, updateData, onValidationChange }: WelcomeStepProps) {
    const [displayName, setDisplayName] = useState(data.displayName);

    const validateStep = () => {
        const isValid = displayName.trim().length >= 2;
        onValidationChange(isValid);
        return isValid;
    };

    useEffect(() => {
        validateStep();
    }, [displayName]);

    const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDisplayName(value);
        updateData('displayName', value);
    };

    return (
        <div className="wizard-step welcome-step">
            <div className="logo-container">
                <Image
                    src="/images/logo_square_bkg.svg"
                    alt="Logo"
                    width={90}
                    height={90}
                    priority
                />
            </div>
            <div className="step-header">
                <h2>Welcome to Diwa Date</h2>
                <p className="step-description">
                    Let&apos;s set up your profile so you can start meeting amazing people.
                    This will only take a few minutes, and you can always come back to complete it later.
                </p>
                <div className="visibility-notice">
                    <div className="notice-icon">
                        <InfoCircleIcon size="2x" />
                    </div>
                    <div className="notice-text">
                        <strong>Important:</strong> Your profile will not be visible to other users until you complete your profile setup.
                    </div>
                </div>
            </div>

            <div className="step-content">
                <div className="form-section">
                    <h3>How would you like to be known?</h3>
                    <div className="input-container">
                        <label htmlFor="displayName">Display Name *</label>
                        <input
                            type="text"
                            id="displayName"
                            value={displayName}
                            onChange={handleDisplayNameChange}
                            placeholder="Enter your display name"
                            className={`form-input ${displayName.trim().length > 0 && displayName.trim().length < 2 ? 'error' : ''} responsive-input`}
                            maxLength={20}
                        />
                        {displayName.trim().length > 0 && displayName.trim().length < 2 && (
                            <div className="error-message">Display name must be at least 2 characters long</div>
                        )}
                        <div className="input-hint">
                            This is how other users will see your name on the platform.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 