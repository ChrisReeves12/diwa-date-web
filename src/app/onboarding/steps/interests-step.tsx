import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { businessConfig } from '@/config/business';
import { FormGroup, FormControlLabel, Checkbox, FormLabel, Box } from '@mui/material';

interface InterestsStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
}

export function InterestsStep({ data, updateData, onValidationChange }: InterestsStepProps) {
    const [interests, setInterests] = useState(data.interests);
    const [bio, setBio] = useState(data.bio);

    const validateStep = () => {
        // Only require interests to be selected; bio is optional during onboarding
        if (interests.length === 0) {
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

    const handleInterestToggle = (value: string) => {
        const newValues = interests.includes(value)
            ? interests.filter(v => v !== value)
            : interests.length < 7
                ? [...interests, value]
                : interests;
        handleInterestsChange(newValues);
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
                    <Box sx={{ mb: 3 }}>
                        <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                            Interests
                        </FormLabel>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {interestOptions.map(option => (
                                <FormControlLabel
                                    key={option.value}
                                    control={
                                        <Checkbox
                                            checked={interests.includes(option.value)}
                                            onChange={() => handleInterestToggle(option.value)}
                                            disabled={!interests.includes(option.value) && interests.length >= 7}
                                        />
                                    }
                                    label={
                                        <span>
                                            {option.emoji && <span style={{ marginRight: '8px' }}>{option.emoji}</span>}
                                            {option.label}
                                        </span>
                                    }
                                />
                            ))}
                        </FormGroup>
                        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
                            {interests.length}/7 selected
                        </Box>
                    </Box>

                    <div className="form-row">
                        <div className="input-container">
                            <label htmlFor="bio">Tell us about yourself (optional)</label>
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
                            </div>
                            <div className="input-hint">
                                This is your chance to make a great first impression! Tell potential matches what makes you unique.
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
} 