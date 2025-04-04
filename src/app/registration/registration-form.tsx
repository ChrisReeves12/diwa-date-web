'use client';

import './registration.scss';
import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SeekingMatchForm from '@/common/seeking-match-form/seeking-match-form';
import { registrationTitle, registrationSubtitle, registrationPasswordHint } from '@/content/registration-content';
import { UserRegistrationData } from "../../types";
import { Locality } from "@/types/locality.interface";
import LocationSearch from "@/common/location-search/location-search";

export default function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Locality>();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [userGender, setUserGender] = useState(searchParams.get('userSex') || '');
  const [seekingGender, setSeekingGender] = useState(searchParams.get('userSexSeeking') || '');
  const [timezone, setTimezone] = useState('');

  // Form validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone);
    } catch (error) {
      console.error('Error detecting timezone:', error);
      setTimezone('UTC');
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

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

    try {
      const payload = {
        firstName,
        lastName,
        email,
        password,
        dateOfBirth,
        location: selectedLocation,
        userGender,
        seekingGender,
        termsAccepted,
        timezone
      } as UserRegistrationData;

      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        router.push('/');
      } else {
        const data = await response.json();

        if (response.status === 422 && data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ form: data.message || 'Registration failed' });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ form: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-site-container">
      <div className="container">
        <div className="form-container">
          <div className="form-section">
            <h1>{registrationTitle}</h1>
            <h4>{registrationSubtitle}</h4>
            <h5>
              Already have an account? <a href="/login">Login</a>
            </h5>
            <form onSubmit={handleSubmit}>
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
                    className={errors.email && formSubmitted ? 'error' : ''}
                  />
                  {errors.email && formSubmitted && (
                    <div className="error-message">{errors.email}</div>
                  )}
                </div>
              </div>

              <LocationSearch
                onUpdate={(locality) => setSelectedLocation(locality)}
                error={formSubmitted && errors.location ? errors.location : undefined} />

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
                <div className={`input-container ${errors.confirmPassword && formSubmitted ? 'error' : ''}`}>
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

              <div className="form-row">
                <div className={`input-container ${errors.dateOfBirth && formSubmitted ? 'error' : ''}`}>
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={getMaxDate()}
                    className={errors.dateOfBirth && formSubmitted ? 'error' : ''}
                  />
                  {errors.dateOfBirth && formSubmitted && (
                    <div className="error-message">{errors.dateOfBirth}</div>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className={`terms-of-service-container ${errors.terms && formSubmitted ? 'error' : ''}`}>
                  <div
                    className={`checkbox-container ${termsAccepted ? 'checked' : ''}`}
                    onClick={() => setTermsAccepted(!termsAccepted)}
                  ></div>
                  <div className="caption">
                    I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
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
                    disabled={isLoading || !termsAccepted}
                    title={!termsAccepted ? 'You must accept the terms of service' : ''}
                  >
                    Create Account
                  </button>
                  <div className={`loader ${isLoading ? 'is-loading' : ''}`}>
                    <i className="fa fa-spinner"></i>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="image-container"></div>
        </div>
      </div>
    </div>
  );
};
