import Box from '@mui/material/Box';
import './multi-country-select.scss';
import { useState } from 'react';
import { TimesIcon } from 'react-line-awesome';
import { countries } from '@/config/countries';

interface MultiCountrySelectProps {
    selectedCountries?: string[];
    onUpdate: (countries: string[]) => void;
    onClose: () => void;
}

const MAX_COUNTRIES = 5;

export default function MultiCountrySelect({ selectedCountries = [], onUpdate, onClose }: MultiCountrySelectProps) {
    const [selected, setSelected] = useState<string[]>(selectedCountries || []);
    const [error, setError] = useState<string | null>(null);
    const innerWidth = window.innerWidth;

    const handleToggleCountry = (countryName: string) => {
        if (selected.includes(countryName)) {
            setSelected(selected.filter(c => c !== countryName));
            setError(null);
        } else {
            if (selected.length >= MAX_COUNTRIES) {
                setError(`You can only select up to ${MAX_COUNTRIES} countries`);
                return;
            }
            setSelected([...selected, countryName]);
            setError(null);
        }
    };

    const handleSave = () => {
        onUpdate(selected);
        onClose();
    };

    return (
        <Box className="modal-background" sx={{
            position: 'absolute',
            top: innerWidth <= 768 ? '8vh' : '25%',
            left: '50%',
            transform: 'translate(-50%)',
            width: innerWidth <= 768 ? '87vw' : '40vw',
            maxWidth: 600,
            bgcolor: 'white',
            outlineWidth: 0,
            borderRadius: 1.5,
            boxShadow: 2
        }}>
            <div className="multi-country-select-container">
                <div className="title-section">
                    <h2>Select Countries</h2>
                    <div className="close-button-container">
                        <button onClick={onClose}>
                            <TimesIcon />
                        </button>
                    </div>
                </div>
                <div className="content-area">
                    {error && <div className="error-message">{error}</div>}
                    <div className="countries-list">
                        {countries.map((country) => (
                            <div
                                key={country.code}
                                className={`country-item ${selected.includes(country.name) ? 'selected' : ''} ${selected.length >= MAX_COUNTRIES && 
                                    !selected.includes(country.name) ? 'disabled' : ''}`}
                                onClick={() => handleToggleCountry(country.name)}
                            >
                                {country.name}
                            </div>
                        ))}
                    </div>

                    <div className="actions">
                        <div className="selected-count">
                            {selected.length} of {MAX_COUNTRIES} countries selected
                        </div>
                        <div className="buttons">
                            <button type="button" className="save-button" onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Box>
    );
}
