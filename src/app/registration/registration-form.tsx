'use client';

import './registration.scss';
import React, { useState, useEffect } from 'react';

// @ts-ignore
import { getCurrentBrowserFingerPrint } from "@rajesh896/broprint.js";

import { useRouter, useSearchParams } from 'next/navigation';
import SeekingMatchForm from '@/common/seeking-match-form/seeking-match-form';
import { registrationTitle, registrationSubtitle, registrationPasswordHint } from '@/content/registration-content';
import { Locality } from "@/types/locality.interface";
import LocationSearch from "@/common/location-search/location-search";
import MuiDatePicker from '@/common/mui-date-picker/mui-date-picker';
import { registerAction } from './registration-form-actions';
import { getGoogleSignUpUrl } from './google-signup.actions';
import { CircularProgress } from '@mui/material';
import { countries } from "@/config/countries";
import { getGeoBoundsForCountry, loadGoogleMapsScript } from "@/util";

export default function RegistrationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const authMethod = searchParams.get('authMethod');
    const googleData = searchParams.get('googleData');

    // Parse Google data if present
    const googleUserData = googleData ? JSON.parse(Buffer.from(googleData, 'base64').toString()) : null;

    const [firstName, setFirstName] = useState(googleUserData?.firstName || '');
    const [lastName, setLastName] = useState(googleUserData?.lastName || '');
    const [email, setEmail] = useState(googleUserData?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<Locality>();
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [userGender, setUserGender] = useState(searchParams.get('userSex') || '');
    const [seekingGender, setSeekingGender] = useState(searchParams.get('userSexSeeking') || '');
    const [countryBounds, setCountryBounds] = useState<google.maps.LatLngBounds | undefined>();
    const [country, setCountry] = useState('');
    const [timezone, setTimezone] = useState('');
    const [googleId, setGoogleId] = useState(googleUserData?.googleId || '');
    const isGoogleSignup = authMethod === 'google';

    // Form validation states
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    useEffect(() => {
        try {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setTimezone(detectedTimezone);
        } catch (error) {
            console.error('Error detecting timezone:', error);
            setTimezone('UTC');
        }
    }, []);

    // Load Google Maps script when component mounts
    useEffect(() => {
        loadGoogleMapsScript();
    }, []);

    // Track custom Meta Pixel event when registration page is viewed
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).fbq) {
            (window as any).fbq('trackCustom', 'ViewedRegistrationPage');
        }
    }, []);


    // Calculate max date (18 years ago)
    const getMaxDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        return today.toISOString().split('T')[0];
    };

    // Validate form
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
        }

        // Skip password validation for Google signups
        if (!isGoogleSignup) {
            if (!password) {
                newErrors.password = 'Password is required';
            } else if (password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters';
            }

            if (password !== confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        }

        if (!selectedLocation) {
            newErrors.location = 'Please search and select your location';
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

        if (!termsAccepted) {
            newErrors.terms = 'You must accept the terms of service';
        }

        if (!userGender) {
            newErrors.userGender = 'Please select your gender';
        }

        if (!seekingGender) {
            newErrors.seekingGender = 'Please select who you are looking for';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGoogleSignUp = async () => {
        setIsGoogleLoading(true);
        try {
            const googleSignUpUrl = await getGoogleSignUpUrl();
            window.location.href = googleSignUpUrl;
        } catch (error) {
            console.error('Failed to initiate Google sign up:', error);
            setErrors({
                form: 'Failed to initiate Google sign up. Please try again.'
            });
            setIsGoogleLoading(false);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        if (isLoading) {
            return;
        }

        setFormSubmitted(true);

        // Return early if terms aren't accepted
        if (!termsAccepted) {
            setErrors({ terms: 'You must accept the terms of service' });
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        setTimeout(async () => {
            try {
                // Add form data fields
                formData.set('firstName', firstName);
                formData.set('lastName', lastName);
                formData.set('email', email);
                if (!isGoogleSignup) {
                    formData.set('password', password);
                }
                formData.set('dateOfBirth', dateOfBirth);
                formData.set('location', JSON.stringify(selectedLocation));
                formData.set('userGender', userGender);
                formData.set('seekingGender', seekingGender);
                formData.set('termsAccepted', termsAccepted.toString());
                formData.set('country', country);
                formData.set('timezone', timezone);
                if (isGoogleSignup) {
                    formData.set('authMethod', 'google');
                    if (googleId) {
                        formData.set('googleId', googleId);
                    }
                }

                const fingerprint = await getCurrentBrowserFingerPrint();
                const cookies = document.cookie;
                const userAgent = navigator.userAgent;

                // Get cookie consent status
                const cookieConsent = localStorage.getItem('cookieConsent') || 'declined';

                formData.set('browserFingerprint', fingerprint);
                formData.set('browserCookies', cookies);
                formData.set('browserUserAgent', userAgent);
                formData.set('cookieConsent', cookieConsent);

                // Generate unique event ID for Meta deduplication
                const eventId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
                formData.set('metaEventId', eventId);

                // Track CompleteRegistration event with Meta Pixel (client-side)
                if (typeof window !== 'undefined' && (window as any).fbq) {
                    (window as any).fbq('track', 'CompleteRegistration', {}, { eventID: eventId });
                }

                // Call the server action
                const result = await registerAction(formData);

                if (result.success) {
                    router.push('/onboarding');
                } else {
                    if (result.errors) {
                        setErrors(result.errors);
                    } else {
                        setErrors({ form: result.message || 'Registration failed' });
                    }
                }
            } catch (error) {
                console.error('Registration error:', error);
                setErrors({ form: 'An unexpected error occurred' });
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    return (
        <div className="registration-site-container">
            <div className="container">
                <div className="form-container">
                    <div className="form-section">
                        <h1>{isGoogleSignup ? 'Complete Your Account' : registrationTitle}</h1>
                        <h4>{registrationSubtitle}</h4>
                        <h5>
                            Already have an account? <a href="/login">Login</a>
                        </h5>

                        {!isGoogleSignup && (
                            <>
                                <div className="google-signup-container">
                                    <button
                                        type="button"
                                        className="btn-google"
                                        onClick={handleGoogleSignUp}
                                        disabled={isGoogleLoading}
                                    >
                                        {isGoogleLoading ? (
                                            <CircularProgress size={20} sx={{ color: "primary.main" }} />
                                        ) : (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                                </svg>
                                                Sign Up with Google
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="divider">
                                    <span>or continue below</span>
                                </div>
                            </>
                        )}
                        <form action={handleSubmit}>
                            <div className="registration-seeking-container">
                                <div className="input-container">
                                    <SeekingMatchForm
                                        initialUserSex={userGender}
                                        initialUserSexSeeking={seekingGender}
                                        onUpdate={(data) => {
                                            if (data.userSex) setUserGender(data.userSex);
                                            if (data.userSexSeeking) setSeekingGender(data.userSexSeeking);
                                        }}
                                    />

                                    {(errors.userGender || errors.seekingGender) && formSubmitted && (
                                        <div className="error-message">
                                            {errors.userGender || errors.seekingGender}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className={`input-container ${errors.firstName && formSubmitted ? 'error' : ''}`}>
                                    <label htmlFor="firstName">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={isGoogleSignup}
                                        className={errors.firstName && formSubmitted ? 'error' : ''}
                                    />
                                    {errors.firstName && formSubmitted && (
                                        <div className="error-message">{errors.firstName}</div>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className={`input-container ${errors.lastName && formSubmitted ? 'error' : ''}`}>
                                    <label htmlFor="lastName">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={isGoogleSignup}
                                        className={errors.lastName && formSubmitted ? 'error' : ''}
                                    />
                                    {errors.lastName && formSubmitted && (
                                        <div className="error-message">{errors.lastName}</div>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className={`input-container ${errors.email && formSubmitted ? 'error' : ''}`}>
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isGoogleSignup}
                                        className={errors.email && formSubmitted ? 'error' : ''}
                                    />
                                    {errors.email && formSubmitted && (
                                        <div className="error-message">{errors.email}</div>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className={`input-container ${errors.country ? 'error' : ''}`}>
                                    <label htmlFor="country">Country</label>
                                    <select value={country} onChange={async (e: any) => {
                                        setCountry(e.target.value);

                                        if (!e.target.value) {
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
                                        <option value="">Select Country</option>
                                        {countries.map((country) =>
                                            <option key={country.code} value={country.name}>{country.name}</option>)}
                                    </select>
                                    {errors.country && (
                                        <div className="error-message">{errors.country}</div>
                                    )}
                                </div>
                            </div>

                            {!!country && !!countryBounds &&
                                <LocationSearch
                                    label="City"
                                    geoBounds={countryBounds}
                                    onUpdate={(locality) => setSelectedLocation(locality)}
                                    error={formSubmitted && errors.location ? errors.location : undefined} />
                            }

                            {!isGoogleSignup && (
                                <>
                                    <div className="form-row">
                                        <div className={`input-container ${errors.password && formSubmitted ? 'error' : ''}`}>
                                            <label htmlFor="password">Password</label>
                                            <input
                                                type="password"
                                                id="password"
                                                name="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className={errors.password && formSubmitted ? 'error' : ''}
                                            />
                                            {errors.password && formSubmitted && (
                                                <div className="error-message">{errors.password}</div>
                                            )}
                                            <div className="sub-label">{registrationPasswordHint}</div>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div
                                            className={`input-container ${errors.confirmPassword && formSubmitted ? 'error' : ''}`}>
                                            <label htmlFor="confirmPassword">Confirm Password</label>
                                            <input
                                                type="password"
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={errors.confirmPassword && formSubmitted ? 'error' : ''}
                                            />
                                            {errors.confirmPassword && formSubmitted && (
                                                <div className="error-message">{errors.confirmPassword}</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="form-row">
                                <MuiDatePicker
                                    value={dateOfBirth}
                                    onChange={setDateOfBirth}
                                    label="Date of Birth"
                                    maxDate={new Date(getMaxDate())}
                                    error={errors.dateOfBirth && formSubmitted ? errors.dateOfBirth : undefined}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div
                                    className={`terms-of-service-container ${errors.terms && formSubmitted ? 'error' : ''}`}>
                                    <div
                                        className={`checkbox-container ${termsAccepted ? 'checked' : ''}`}
                                        onClick={() => setTermsAccepted(!termsAccepted)}
                                    ></div>
                                    <div className="caption">
                                        I agree to the <a href="/terms-of-service" target="_blank">Terms of
                                            Service</a> and <a href="/community-guidelines" target="_blank">Community
                                                Guidelines</a>
                                    </div>
                                    {errors.terms && formSubmitted && (
                                        <div className="error-message">{errors.terms}</div>
                                    )}
                                </div>
                            </div>

                            {errors.form && (
                                <div className="form-row">
                                    <div className="error-message">{errors.form}</div>
                                </div>
                            )}

                            <div className="submit-button-wrapper">
                                <div className="form-row form-row-loader-container">
                                    <button
                                        className="btn-primary"
                                        type="submit"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 10
                                        }}
                                        title={!termsAccepted ? 'You must accept the terms of service' : ''}
                                    >
                                        {isLoading && <div className="loader">
                                            <CircularProgress size={20} sx={{ color: "white" }} />
                                        </div>}
                                        <span>Create Account</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div
                        style={{ backgroundImage: `url('${process.env.NEXT_PUBLIC_IMAGE_ROOT || ''}/images/registration_photo1.webp')` }}
                        className="image-container"></div>
                </div>
            </div>
        </div>
    );
};
