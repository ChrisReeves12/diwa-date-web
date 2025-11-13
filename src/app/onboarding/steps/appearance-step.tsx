import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { businessConfig } from '@/config/business';
import SingleSelect from '@/common/single-select/single-select';

interface AppearanceStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
}

export function AppearanceStep({ data, updateData, onValidationChange }: AppearanceStepProps) {
    const [height, setHeight] = useState(data.height);
    const [bodyType, setBodyType] = useState(data.bodyType);

    const validateStep = () => {
        const isValid = height.trim() !== '' && bodyType.trim() !== '';
        onValidationChange(isValid);
        return isValid;
    };

    useEffect(() => {
        validateStep();
    }, [height, bodyType]);

    const handleHeightChange = (value: string) => {
        setHeight(value);
        updateData('height', value);
    };

    const handleBodyTypeChange = (value: string) => {
        setBodyType(value);
        updateData('bodyType', value);
    };

    // Convert business config options to component format
    const heightOptions = Object.entries(businessConfig.options.height).map(([value, label]) => ({
        value,
        label
    }));

    const bodyTypeOptions = Object.entries(businessConfig.options.bodyTypes).map(([value, label]) => ({
        value,
        label
    }));

    return (
        <div className="wizard-step appearance-step">
            <div className="step-header">
                <h2>Tell us about your appearance</h2>
                <p className="step-description">
                    This information helps us show you compatible matches. Please fill out both fields to continue.
                </p>
            </div>

            <div className="step-content">
                <div className="form-section">
                    <div className="form-row form-row-split">
                        <SingleSelect
                            options={heightOptions}
                            selectedValue={height}
                            onChange={handleHeightChange}
                            label="Height *"
                            placeholder="Select your height..."
                        />

                        <SingleSelect
                            options={bodyTypeOptions}
                            selectedValue={bodyType}
                            onChange={handleBodyTypeChange}
                            label="Body Type *"
                            placeholder="Select your body type..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 