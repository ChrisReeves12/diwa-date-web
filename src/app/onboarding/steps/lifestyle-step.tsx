import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { businessConfig } from '@/config/business';
import SingleSelect from '@/common/single-select/single-select';

interface LifestyleStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
}

export function LifestyleStep({ data, updateData, onValidationChange }: LifestyleStepProps) {
    const [maritalStatus, setMaritalStatus] = useState(data.maritalStatus);
    const [hasChildren, setHasChildren] = useState(data.hasChildren);
    const [wantsChildren, setWantsChildren] = useState(data.wantsChildren);
    const [drinking, setDrinking] = useState(data.drinking);
    const [smoking, setSmoking] = useState(data.smoking);

    const validateStep = () => {
        if (maritalStatus.trim() === '' || hasChildren.trim() === '' || wantsChildren.trim() === '' || drinking.trim() === '' || smoking.trim() === '') {
            onValidationChange(false);
            return;
        }

        onValidationChange(true);
    };

    useEffect(() => {
        validateStep();
    }, [maritalStatus, hasChildren, wantsChildren, drinking, smoking]);

    const handleMaritalStatusChange = (value: string) => {
        setMaritalStatus(value);
        updateData('maritalStatus', value);
    };

    const handleHasChildrenChange = (value: string) => {
        setHasChildren(value);
        updateData('hasChildren', value);
    };

    const handleWantsChildrenChange = (value: string) => {
        setWantsChildren(value);
        updateData('wantsChildren', value);
    };

    const handleDrinkingChange = (value: string) => {
        setDrinking(value);
        updateData('drinking', value);
    };

    const handleSmokingChange = (value: string) => {
        setSmoking(value);
        updateData('smoking', value);
    };

    // Convert business config options to component format
    const maritalStatusOptions = Object.entries(businessConfig.options.maritalStatuses).map(([value, label]) => ({
        value,
        label
    }));

    const hasChildrenOptions = Object.entries(businessConfig.options.hasChildrenStatuses).map(([value, label]) => ({
        value,
        label
    }));

    const wantsChildrenOptions = Object.entries(businessConfig.options.wantsChildrenStatuses).map(([value, label]) => ({
        value,
        label
    }));

    const drinkingOptions = Object.entries(businessConfig.options.drinkingStatuses).map(([value, label]) => ({
        value,
        label
    }));

    const smokingOptions = Object.entries(businessConfig.options.smokingStatuses).map(([value, label]) => ({
        value,
        label
    }));

    return (
        <div className="wizard-step lifestyle-step">
            <div className="step-header">
                <h2>Tell us about your lifestyle</h2>
                <p className="step-description">
                    Share some details about your family situation and lifestyle preferences.
                    Please fill out your marital status to continue.
                </p>
            </div>

            <div className="step-content">
                <div className="form-section">
                    <h3>Family</h3>

                    <div className="form-row">
                        <SingleSelect
                            options={maritalStatusOptions}
                            selectedValue={maritalStatus}
                            onChange={handleMaritalStatusChange}
                            label="Marital Status *"
                            placeholder="Select marital status..."
                        />
                    </div>

                    <div className="form-row form-row-split">
                        <SingleSelect
                            options={hasChildrenOptions}
                            selectedValue={hasChildren}
                            onChange={handleHasChildrenChange}
                            label="Do you have children?"
                            placeholder="Select option..."
                        />

                        <SingleSelect
                            options={wantsChildrenOptions}
                            selectedValue={wantsChildren}
                            onChange={handleWantsChildrenChange}
                            label="Do you want children?"
                            placeholder="Select option..."
                        />
                    </div>

                    <h3>Social Habits</h3>

                    <div className="form-row form-row-split">
                        <SingleSelect
                            options={drinkingOptions}
                            selectedValue={drinking}
                            onChange={handleDrinkingChange}
                            label="Do you drink?"
                            placeholder="Select option..."
                        />

                        <SingleSelect
                            options={smokingOptions}
                            selectedValue={smoking}
                            onChange={handleSmokingChange}
                            label="Do you smoke?"
                            placeholder="Select option..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 