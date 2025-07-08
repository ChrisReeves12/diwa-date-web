import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { businessConfig } from '@/config/business';
import MultiSelect from '@/common/multi-select/multi-select';
import SingleSelect from '@/common/single-select/single-select';

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

    const handleReligionsChange = (value: string[]) => {
        setReligions(value);
        updateData('religions', value);
    };

    const handleEducationChange = (value: string) => {
        setEducation(value);
        updateData('education', value);
    };

    const handleLanguagesChange = (value: string[]) => {
        setLanguages(value);
        updateData('languages', value);
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
                    <MultiSelect
                        options={ethnicityOptions}
                        selectedValues={ethnicities}
                        onChange={handleEthnicitiesChange}
                        maxSelections={3}
                        label="Ethnicity"
                        placeholder="Select ethnicities..."
                    />

                    <MultiSelect
                        options={religionOptions}
                        selectedValues={religions}
                        onChange={handleReligionsChange}
                        maxSelections={3}
                        label="Religion"
                        placeholder="Select religion..."
                    />

                    <div className="form-row form-row-split">
                        <SingleSelect
                            options={educationOptions}
                            selectedValue={education}
                            onChange={handleEducationChange}
                            label="Highest Level of Education *"
                            placeholder="Select education level..."
                        />

                        <div style={{ flex: 1 }}>
                            <MultiSelect
                                options={languageOptions}
                                selectedValues={languages}
                                onChange={handleLanguagesChange}
                                maxSelections={3}
                                label="Languages"
                                placeholder="Select languages..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 