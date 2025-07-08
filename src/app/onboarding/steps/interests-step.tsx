import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { businessConfig } from '@/config/business';
import MultiSelect from '@/common/multi-select/multi-select';

interface InterestsStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
}

export function InterestsStep({ data, updateData, onValidationChange }: InterestsStepProps) {
    const [interests, setInterests] = useState(data.interests);
    const [bio, setBio] = useState(data.bio);

    const validateStep = () => {
        if (interests.length === 0 || bio.trim().length < 50) {
            onValidationChange(false);
            return;
        }

        onValidationChange(true);
    };

    useEffect(() => {
        validateStep();
    }, [interests, bio]);

    const handleInterestsChange = (value: string[]) => {
        setInterests(value);
        updateData('interests', value);
    };

    const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setBio(value);
        updateData('bio', value);
    };

    // Convert business config options to component format
    const interestOptions = Object.entries(businessConfig.options.interests).map(([value, config]) => ({
        value,
        label: config.label,
        emoji: config.emoji
    }));

    return (
        <div className="wizard-step interests-step">
            <div className="step-header">
                <h2>What are you passionate about?</h2>
                <p className="step-description">
                    Share your interests and tell us about yourself to help others get to know you better.
                </p>
            </div>

            <div className="step-content">
                <div className="form-section">
                    <MultiSelect
                        options={interestOptions}
                        selectedValues={interests}
                        onChange={handleInterestsChange}
                        maxSelections={7}
                        label="Interests"
                        placeholder="Select interests..."
                    />

                    <div className="form-row">
                        <div className="input-container">
                            <label htmlFor="bio">Tell us about yourself</label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={handleBioChange}
                                placeholder="Share something interesting about yourself, and what you're looking for in a partner..."
                                rows={6}
                                className="form-textarea"
                            />
                            <div className="character-counter">
                                {bio.length}/3000 characters
                                {bio.length > 0 && bio.length < 50 && (
                                    <span className="min-warning"> (minimum 50 characters recommended)</span>
                                )}
                            </div>
                            <div className="input-hint">
                                This is your chance to make a great first impression! Tell potential matches what makes you unique.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="completion-notice">
                    <div className="notice-icon">🎉</div>
                    <div className="notice-text">
                        <h3>Almost done!</h3>
                        <p>
                            You&apos;re about to complete your profile setup. Once you finish,
                            your profile will be visible to other users and you can start connecting with amazing people!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 