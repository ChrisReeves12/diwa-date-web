'use client';

import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment, { Moment } from 'moment';
import './mui-date-picker.scss';

interface MuiDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    maxDate?: Date;
    minDate?: Date;
    className?: string;
}

export default function MuiDatePicker({
    value,
    onChange,
    label,
    placeholder,
    error,
    required = false,
    maxDate,
    minDate,
    className = ''
}: MuiDatePickerProps) {
    const handleDateChange = (newValue: Moment | null) => {
        if (newValue && newValue.isValid()) {
            // Convert moment to YYYY-MM-DD format to match existing HTML input behavior
            onChange(newValue.format('YYYY-MM-DD'));
        } else {
            onChange('');
        }
    };

    // Convert string value to moment object for the picker
    const momentValue = value ? moment(value) : null;

    return (
        <div className={`mui-date-picker-container ${error ? 'error' : ''} ${className}`}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
                <DatePicker
                    label={label + (required ? ' *' : '')}
                    value={momentValue}
                    onChange={handleDateChange}
                    maxDate={maxDate ? moment(maxDate) : undefined}
                    minDate={minDate ? moment(minDate) : undefined}
                    slotProps={{
                        textField: {
                            error: !!error,
                            helperText: error,
                            fullWidth: true,
                            variant: 'outlined' as const,
                            placeholder: placeholder
                        }
                    }}
                />
            </LocalizationProvider>
        </div>
    );
}