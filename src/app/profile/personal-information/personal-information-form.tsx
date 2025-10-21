'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/types/user.interface';
import { Locality } from '@/types/locality.interface';
import { businessConfig } from '@/config/business';
import SeekingMatchForm from '@/common/seeking-match-form/seeking-match-form';
import LocationSearch from '@/common/location-search/location-search';
import SingleSelect from '@/common/single-select/single-select';
import MuiDatePicker from '@/common/mui-date-picker/mui-date-picker';
import { FormGroup, FormControlLabel, Checkbox, FormLabel, Box } from '@mui/material';
import { updatePersonalInformation } from './personal-information-actions';
import { countries } from "@/config/countries";
import { getGeoBoundsForCountry, loadGoogleMapsScript } from "@/util";
import '../profile-settings.scss';

interface PersonalInformationFormProps {
    currentUser: User;
}

export function PersonalInformationForm({ currentUser }: PersonalInformationFormProps) {
    // Form ref for scrolling
    const formRef = useRef<HTMLDivElement>(null);

    // Basic Information
    const [displayName, setDisplayName] = useState(currentUser.displayName || '');
    const [firstName, setFirstName] = useState(currentUser.firstName || '');
    const [lastName, setLastName] = useState(currentUser.lastName || '');
    const [dateOfBirth, setDateOfBirth] = useState(
        currentUser.dateOfBirth ? new Date(currentUser.dateOfBirth).toISOString().split('T')[0] : ''
    );
    const [bio, setBio] = useState(currentUser.bio || '');

    // Location Information
    const [selectedLocation, setSelectedLocation] = useState<Locality | undefined>(
        currentUser.locationName ? {
            name: currentUser.locationName,
            coordinates: {
                latitude: currentUser.latitude || 0,
                longitude: currentUser.longitude || 0
            },
            country: currentUser.country || '',
            viewport: currentUser.locationViewport
        } : undefined
    );
    const [country, setCountry] = useState(currentUser.country || '');
    const [countryBounds, setCountryBounds] = useState<google.maps.LatLngBounds | undefined>();

    // Gender Information
    const [userGender, setUserGender] = useState(currentUser.gender || '');
    const [seekingGender, setSeekingGender] = useState(currentUser.seekingGender || '');

    // Appearance
    const [height, setHeight] = useState(currentUser.height?.toString() || '');
    const [bodyType, setBodyType] = useState(currentUser.bodyType || '');

    // Culture and Background
    const [ethnicities, setEthnicities] = useState<string[]>(currentUser.ethnicities || []);
    const [religions, setReligions] = useState<string[]>(currentUser.religions || []);
    const [education, setEducation] = useState(currentUser.education || '');
    const [languages, setLanguages] = useState<string[]>(currentUser.languages || []);

    // Family
    const [maritalStatus, setMaritalStatus] = useState(currentUser.maritalStatus || '');
    const [hasChildren, setHasChildren] = useState(currentUser.hasChildren || '');
    const [wantsChildren, setWantsChildren] = useState(currentUser.wantsChildren || '');

    // Social Activity and Lifestyle
    const [drinking, setDrinking] = useState(currentUser.drinking || '');
    const [smoking, setSmoking] = useState(currentUser.smoking || '');
    const [interests, setInterests] = useState<string[]>(currentUser.interests || []);

    // Form state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);

    // Toggle handlers for checkbox groups
    const handleEthnicityToggle = (value: string) => {
        const newValues = ethnicities.includes(value)
            ? ethnicities.filter(v => v !== value)
            : ethnicities.length < 3
                ? [...ethnicities, value]
                : ethnicities;
        setEthnicities(newValues);
    };

    const handleReligionToggle = (value: string) => {
        const newValues = religions.includes(value)
            ? religions.filter(v => v !== value)
            : religions.length < 3
                ? [...religions, value]
                : religions;
        setReligions(newValues);
    };

    const handleLanguageToggle = (value: string) => {
        const newValues = languages.includes(value)
            ? languages.filter(v => v !== value)
            : languages.length < 3
                ? [...languages, value]
                : languages;
        setLanguages(newValues);
    };

    const handleInterestToggle = (value: string) => {
        const newValues = interests.includes(value)
            ? interests.filter(v => v !== value)
            : interests.length < 7
                ? [...interests, value]
                : interests;
        setInterests(newValues);
    };

    // Calculate max date (18 years ago)
    const getMaxDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        return today.toISOString().split('T')[0];
    };

    // Validate form
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Required fields
        if (!displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }

        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!selectedLocation) {
            newErrors.location = 'Location is required';
        }

        if (!dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        } else {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                if (age - 1 < 18) {
                    newErrors.dateOfBirth = 'You must be at least 18 years old';
                }
            } else if (age < 18) {
                newErrors.dateOfBirth = 'You must be at least 18 years old';
            }
        }

        if (!userGender) {
            newErrors.userGender = 'Gender is required';
        }

        if (!seekingGender) {
            newErrors.seekingGender = 'Seeking gender is required';
        }

        // Bio validation
        if (bio && (bio.length < 50 || bio.length > 3000)) {
            newErrors.bio = 'Bio must be between 50 and 3000 characters';
        }

        // Multi-select limits
        if (ethnicities.length > 3) {
            newErrors.ethnicities = 'You can select up to 3 ethnicities';
        }

        if (religions.length > 3) {
            newErrors.religions = 'You can select up to 3 religions';
        }

        if (languages.length > 3) {
            newErrors.languages = 'You can select up to 3 languages';
        }

        if (interests.length > 7) {
            newErrors.interests = 'You can select up to 7 interests';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            // Scroll to top when there are validation errors
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsLoading(true);
        setSuccessMessage('');

        setTimeout(async () => {
            try {
                const formData = {
                    displayName,
                    firstName,
                    lastName,
                    dateOfBirth,
                    bio,
                    location: selectedLocation,
                    country,
                    userGender,
                    seekingGender,
                    height: height ? parseInt(height) : undefined,
                    bodyType,
                    ethnicities,
                    religions,
                    education,
                    languages,
                    maritalStatus,
                    hasChildren,
                    wantsChildren,
                    drinking,
                    smoking,
                    interests
                };

                const result = await updatePersonalInformation(formData);

                if (result.success) {
                    setSuccessMessage('Profile updated successfully!');
                    setErrors({});

                    // Scroll to the very top of the page after successful update
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else if ('errors' in result) {
                    if (result.errors) {
                        setErrors(result.errors);
                    } else {
                        setErrors({ form: 'Update failed' });
                    }
                    // Scroll to top when there are server errors
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) {
                console.error('Update error:', error);
                setErrors({ form: 'An unexpected error occurred' });
                // Scroll to top when there's an unexpected error
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    useEffect(() => {
        if (successMessage) {
            setShowSuccessAlert(true);
        } else {
            setShowSuccessAlert(false);
        }
    }, [successMessage]);

    // Load Google Maps script when component mounts
    useEffect(() => {
        loadGoogleMapsScript();
    }, []);

    // Convert business config options to component format
    const heightOptions = Object.entries(businessConfig.options.height).map(([value, label]) => ({
        value,
        label
    }));

    const bodyTypeOptions = Object.entries(businessConfig.options.bodyTypes).map(([value, label]) => ({
        value,
        label
    }));

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

    const interestOptions = Object.entries(businessConfig.options.interests).map(([value, config]) => ({
        value,
        label: config.label,
        emoji: config.emoji
    }));

    return (
        <div className="personal-information-form" ref={formRef}>
            {successMessage && (
                <div className={`success-alert ${showSuccessAlert ? 'show' : ''}`}>
                    <div className="success-alert-content">
                        <div className="success-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor" />
                            </svg>
                        </div>
                        <div className="success-message-text">
                            {successMessage}
                        </div>
                    </div>
                    <button onClick={() => setSuccessMessage('')} className="success-close-btn" aria-label="Close notification">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                {/* Basic Information Section */}
                <div className="form-section">
                    <h3>Basic Information</h3>

                    <div className="form-row">
                        <div className={`input-container ${errors.displayName ? 'error' : ''}`}>
                            <label htmlFor="displayName">Display Name *</label>
                            <input
                                type="text"
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className={errors.displayName ? 'error' : ''}
                                maxLength={20}
                            />
                            {errors.displayName && (
                                <div className="error-message">{errors.displayName}</div>
                            )}
                        </div>
                    </div>

                    <div className="form-row form-row-split">
                        <div className={`input-container ${errors.firstName ? 'error' : ''}`}>
                            <label htmlFor="firstName">First Name *</label>
                            <input
                                type="text"
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className={errors.firstName ? 'error' : ''}
                            />
                            {errors.firstName && (
                                <div className="error-message">{errors.firstName}</div>
                            )}
                        </div>

                        <div className={`input-container ${errors.lastName ? 'error' : ''}`}>
                            <label htmlFor="lastName">Last Name *</label>
                            <input
                                type="text"
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className={errors.lastName ? 'error' : ''}
                            />
                            {errors.lastName && (
                                <div className="error-message">{errors.lastName}</div>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <MuiDatePicker
                            value={dateOfBirth}
                            onChange={setDateOfBirth}
                            label="Date of Birth"
                            maxDate={new Date(getMaxDate())}
                            error={errors.dateOfBirth}
                            required
                            className="date-picker-narrow"
                        />
                    </div>

                    <div className="form-row">
                        <div className={`input-container ${errors.bio ? 'error' : ''}`}>
                            <label htmlFor="bio">About Me</label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className={errors.bio ? 'error' : ''}
                                placeholder="Tell others about yourself..."
                                rows={4}
                            />
                            <div className="character-counter">
                                {bio.length}/3000 characters
                                {bio.length > 0 && bio.length < 50 && (
                                    <span className="min-warning"> (minimum 50 characters)</span>
                                )}
                            </div>
                            {errors.bio && (
                                <div className="error-message">{errors.bio}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Location Information Section */}
                <div className="form-section">
                    <h3>Location Information</h3>

                    <div className="form-row">
                        <div className={`input-container ${errors.country ? 'error' : ''}`}>
                            <label htmlFor="country">Country</label>
                            <select value={country} onChange={async (e: any) => {
                                setCountry(e.target.value);

                                if (!e.target.value) {
                                    setCountryBounds(undefined);
                                    return;
                                }

                                const countryObj = countries.find(c => c.name === e.target.value);
                                if (!countryObj) {
                                    return;
                                }

                                try {
                                    // Ensure Google Maps is loaded
                                    if (typeof google === 'undefined' || !google.maps) {
                                        console.error('Google Maps not loaded');
                                        setErrors({ country: 'Google Maps is not available. Please refresh the page and try again.' });
                                        return;
                                    }

                                    const geoCodeResult = await getGeoBoundsForCountry(countryObj);
                                    setCountryBounds(geoCodeResult.geometry.viewport);
                                } catch (error) {
                                    console.error('Error getting country bounds:', error);
                                    setErrors({ country: 'Failed to load country data. Please try again.' });
                                }
                            }} name="country">
                                {countries.map((countryOption) =>
                                    <option key={countryOption.code} value={countryOption.name}>{countryOption.name}</option>)}
                            </select>
                            {errors.country && (
                                <div className="error-message">{errors.country}</div>
                            )}
                        </div>
                    </div>

                    <LocationSearch
                        label="City"
                        geoBounds={countryBounds}
                        onUpdate={(locality) => setSelectedLocation(locality)}
                        error={errors.location}
                        initialLocality={selectedLocation}
                    />
                </div>

                {/* Gender Information Section */}
                <div className="form-section">
                    <h3>Gender Identification and Seeking</h3>
                    <SeekingMatchForm
                        initialUserSex={userGender}
                        initialUserSexSeeking={seekingGender}
                        userSexError={errors.userGender}
                        userSexSeekingError={errors.seekingGender}
                        onUpdate={(data) => {
                            if (data.userSex) setUserGender(data.userSex);
                            if (data.userSexSeeking) setSeekingGender(data.userSexSeeking);
                        }}
                    />
                </div>

                {/* Appearance Section */}
                <div className="form-section">
                    <h3>Appearance</h3>

                    <div className="form-row form-row-split">
                        <SingleSelect
                            options={heightOptions}
                            selectedValue={height}
                            onChange={setHeight}
                            label="Height"
                            placeholder="Select height..."
                        />

                        <SingleSelect
                            options={bodyTypeOptions}
                            selectedValue={bodyType}
                            onChange={setBodyType}
                            label="Body Type"
                            placeholder="Select body type..."
                        />
                    </div>
                </div>

                {/* Culture and Background Section */}
                <div className="form-section">
                    <h3>Culture and Background</h3>

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
                        {errors.ethnicities && (
                            <Box sx={{ color: 'error.main', fontSize: '0.875rem', mt: 1 }}>
                                {errors.ethnicities}
                            </Box>
                        )}
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
                        {errors.religions && (
                            <Box sx={{ color: 'error.main', fontSize: '0.875rem', mt: 1 }}>
                                {errors.religions}
                            </Box>
                        )}
                    </Box>

                    <div className="form-row">
                        <SingleSelect
                            options={educationOptions}
                            selectedValue={education}
                            onChange={setEducation}
                            label="Highest Level of Education"
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
                        {errors.languages && (
                            <Box sx={{ color: 'error.main', fontSize: '0.875rem', mt: 1 }}>
                                {errors.languages}
                            </Box>
                        )}
                    </Box>
                </div>

                {/* Family Section */}
                <div className="form-section">
                    <h3>Family</h3>

                    <div className="form-row">
                        <SingleSelect
                            options={maritalStatusOptions}
                            selectedValue={maritalStatus}
                            onChange={setMaritalStatus}
                            label="Marital Status"
                            placeholder="Select marital status..."
                        />
                    </div>

                    <div className="form-row form-row-split">
                        <SingleSelect
                            options={hasChildrenOptions}
                            selectedValue={hasChildren}
                            onChange={setHasChildren}
                            label="Do you have children?"
                            placeholder="Select option..."
                        />

                        <SingleSelect
                            options={wantsChildrenOptions}
                            selectedValue={wantsChildren}
                            onChange={setWantsChildren}
                            label="Do you want children?"
                            placeholder="Select option..."
                        />
                    </div>
                </div>

                {/* Social Activity and Lifestyle Section */}
                <div className="form-section">
                    <h3>Social Activity and Lifestyle</h3>

                    <div className="form-row form-row-split">
                        <SingleSelect
                            options={drinkingOptions}
                            selectedValue={drinking}
                            onChange={setDrinking}
                            label="Do you drink?"
                            placeholder="Select option..."
                        />

                        <SingleSelect
                            options={smokingOptions}
                            selectedValue={smoking}
                            onChange={setSmoking}
                            label="Do you smoke?"
                            placeholder="Select option..."
                        />
                    </div>

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
                        {errors.interests && (
                            <Box sx={{ color: 'error.main', fontSize: '0.875rem', mt: 1 }}>
                                {errors.interests}
                            </Box>
                        )}
                    </Box>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                    {errors.form && (
                        <div className="error-message">{errors.form}</div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Updating...' : 'Update Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}