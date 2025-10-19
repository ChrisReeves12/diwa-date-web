import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { businessConfig } from '@/config/business';
import SingleSelect from '@/common/single-select/single-select';
import { FormGroup, FormControlLabel, Checkbox, FormLabel, Box } from '@mui/material';

interface CultureStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
}

export function CultureStep({ data, updateData, onValidationChange }: CultureStepProps) {
    const [ethnicities, setEthnicities] = useState(data.ethnicities);
    const [religions, setReligions] = useState(data.religions);
    const [education, setEducation] = useState(data.education);
    const [languages, setLanguages] = useState(data.languages);

    const validateStep = () => {
        if (ethnicities.length === 0 || religions.length === 0 || languages.length === 0 || education.trim() === '') {
            onValidationChange(false);
            return;
        }

        onValidationChange(true);
    };

    useEffect(() => {
        validateStep();
    }, [ethnicities, religions, languages, education]);

    const handleEthnicitiesChange = (value: string[]) => {
        setEthnicities(value);
        updateData('ethnicities', value);
    };

    const handleEthnicityToggle = (value: string) => {
        const newValues = ethnicities.includes(value)
            ? ethnicities.filter(v => v !== value)
            : ethnicities.length < 3
                ? [...ethnicities, value]
                : ethnicities;
        handleEthnicitiesChange(newValues);
    };

    const handleReligionsChange = (value: string[]) => {
        setReligions(value);
        updateData('religions', value);
    };

    const handleReligionToggle = (value: string) => {
        const newValues = religions.includes(value)
            ? religions.filter(v => v !== value)
            : religions.length < 3
                ? [...religions, value]
                : religions;
        handleReligionsChange(newValues);
    };

    const handleEducationChange = (value: string) => {
        setEducation(value);
        updateData('education', value);
    };

    const handleLanguagesChange = (value: string[]) => {
        setLanguages(value);
        updateData('languages', value);
    };

    const handleLanguageToggle = (value: string) => {
        const newValues = languages.includes(value)
            ? languages.filter(v => v !== value)
            : languages.length < 3
                ? [...languages, value]
                : languages;
        handleLanguagesChange(newValues);
    };

    // Convert business config options to component format
    const ethnicityOptions = Object.entries(businessConfig.options.ethnicities).map(([value, label]) => ({
        value,
        label
    }));

    const religionOptions = Object.entries(businessConfig.options.religions).map(([value, label]) => ({
        value,
        label
    }));

    const educationOptions = Object.entries(businessConfig.options.educationLevels).map(([value, label]) => ({
        value,
        label
    }));

    const languageOptions = Object.entries(businessConfig.options.languages).map(([value, label]) => ({
        value,
        label
    }));

    return (
        <div className="wizard-step culture-step">
            <div className="step-header">
                <h2>Tell us about your background</h2>
                <p className="step-description">
                    Share your cultural background and education to help us find compatible matches.
                    Please fill out your education level to continue.
                </p>
            </div>

            <div className="step-content">
                <div className="form-section">
                    <Box sx={{ mb: 3 }}>
                        <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                            Ethnicity
                        </FormLabel>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {ethnicityOptions.map(option => (
                                <FormControlLabel
                                    key={option.value}
                                    control={
                                        <Checkbox
                                            checked={ethnicities.includes(option.value)}
                                            onChange={() => handleEthnicityToggle(option.value)}
                                            disabled={!ethnicities.includes(option.value) && ethnicities.length >= 3}
                                        />
                                    }
                                    label={option.label}
                                />
                            ))}
                        </FormGroup>
                        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
                            {ethnicities.length}/3 selected
                        </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                            Religion
                        </FormLabel>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {religionOptions.map(option => (
                                <FormControlLabel
                                    key={option.value}
                                    control={
                                        <Checkbox
                                            checked={religions.includes(option.value)}
                                            onChange={() => handleReligionToggle(option.value)}
                                            disabled={!religions.includes(option.value) && religions.length >= 3}
                                        />
                                    }
                                    label={option.label}
                                />
                            ))}
                        </FormGroup>
                        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
                            {religions.length}/3 selected
                        </Box>
                    </Box>

                    <div className="form-row">
                        <SingleSelect
                            options={educationOptions}
                            selectedValue={education}
                            onChange={handleEducationChange}
                            label="Highest Level of Education *"
                            placeholder="Select education level..."
                        />
                    </div>

                    <Box sx={{ pt: '10px', mb: 3 }}>
                        <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                            Languages
                        </FormLabel>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {languageOptions.map(option => (
                                <FormControlLabel
                                    key={option.value}
                                    control={
                                        <Checkbox
                                            checked={languages.includes(option.value)}
                                            onChange={() => handleLanguageToggle(option.value)}
                                            disabled={!languages.includes(option.value) && languages.length >= 3}
                                        />
                                    }
                                    label={option.label}
                                />
                            ))}
                        </FormGroup>
                        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
                            {languages.length}/3 selected
                        </Box>
                    </Box>
                </div>
            </div>
        </div>
    );
} 