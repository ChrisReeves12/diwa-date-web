'use client';

import { useState, useRef, useEffect } from 'react';
import './multi-select.scss';

interface MultiSelectOption {
    value: string;
    label: string;
    emoji?: string;
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    maxSelections?: number;
    placeholder?: string;
    label: string;
    error?: string;
}

export default function MultiSelect({
    options,
    selectedValues,
    onChange,
    maxSelections,
    placeholder = "Select options...",
    label,
    error
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Use a timeout to ensure the click event that opened the dropdown has finished
            const timeoutId = setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 0);
            
            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [isOpen]);

    const handleToggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else if (!maxSelections || selectedValues.length < maxSelections) {
            onChange([...selectedValues, value]);
        }
    };

    const getDisplayText = () => {
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === 1) {
            const option = options.find(opt => opt.value === selectedValues[0]);
            return option ? option.label : selectedValues[0];
        }
        return `${selectedValues.length} selected`;
    };

    return (
        <div className={`multi-select-container ${error ? 'error' : ''}`}>
            <label>{label}</label>
            <div className="multi-select-wrapper" ref={wrapperRef}>
                <div 
                    className={`multi-select-display ${isOpen ? 'open' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    <span className="display-text">{getDisplayText()}</span>
                    <i className={`las la-chevron-down ${isOpen ? 'rotated' : ''}`}></i>
                </div>
                
                {isOpen && (
                    <div className="multi-select-dropdown">
                        {options.map(option => (
                            <div
                                key={option.value}
                                className={`option ${selectedValues.includes(option.value) ? 'selected' : ''} ${
                                    maxSelections && selectedValues.length >= maxSelections && !selectedValues.includes(option.value) ? 'disabled' : ''
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleOption(option.value);
                                }}
                            >
                                <div className="option-content">
                                    {option.emoji && <span className="emoji">{option.emoji}</span>}
                                    <span className="label">{option.label}</span>
                                </div>
                                {selectedValues.includes(option.value) && (
                                    <i className="las la-check"></i>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {maxSelections && (
                <div className="selection-counter">
                    {selectedValues.length}/{maxSelections} selected
                </div>
            )}
            
            {error && (
                <div className="error-message">{error}</div>
            )}
        </div>
    );
}
