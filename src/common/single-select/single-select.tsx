'use client';

import { useState, useRef, useEffect } from 'react';
import './single-select.scss';

interface SingleSelectOption {
    value: string;
    label: string;
}

interface SingleSelectProps {
    options: SingleSelectOption[];
    selectedValue: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label: string;
    error?: string;
    required?: boolean;
}

export default function SingleSelect({
    options,
    selectedValue,
    onChange,
    placeholder = "Select an option...",
    label,
    error,
    required = false
}: SingleSelectProps) {
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

    const handleSelectOption = (value: string) => {
        onChange(value);
        setIsOpen(false);
    };

    const getDisplayText = () => {
        if (!selectedValue) return placeholder;
        const option = options.find(opt => opt.value === selectedValue);
        return option ? option.label : selectedValue;
    };

    return (
        <div className={`single-select-container ${error ? 'error' : ''}`}>
            <label>
                {label}
                {required && <span className="required">*</span>}
            </label>
            <div className="single-select-wrapper" ref={wrapperRef}>
                <div 
                    className={`single-select-display ${isOpen ? 'open' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    <span className={`display-text ${!selectedValue ? 'placeholder' : ''}`}>
                        {getDisplayText()}
                    </span>
                    <i className={`las la-chevron-down ${isOpen ? 'rotated' : ''}`}></i>
                </div>
                
                {isOpen && (
                    <div className="single-select-dropdown">
                        {!required && (
                            <div
                                className={`option ${!selectedValue ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOption('');
                                }}
                            >
                                <span className="label">{placeholder}</span>
                                {!selectedValue && <i className="las la-check"></i>}
                            </div>
                        )}
                        {options.map(option => (
                            <div
                                key={option.value}
                                className={`option ${selectedValue === option.value ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOption(option.value);
                                }}
                            >
                                <span className="label">{option.label}</span>
                                {selectedValue === option.value && (
                                    <i className="las la-check"></i>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {error && (
                <div className="error-message">{error}</div>
            )}
        </div>
    );
}
