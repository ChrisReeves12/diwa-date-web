'use client';

import React, { useState, useEffect } from 'react';
import { User } from "@/types";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import { submitSupportRequest } from './support-center.actions';
import './support.scss';

interface SupportCenterViewProps {
    currentUser: User;
}

export default function SupportCenterView({ currentUser }: SupportCenterViewProps) {
    const [issueType, setIssueType] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);

    const issueTypeOptions = [
        { value: 'Bug Report', label: 'Bug Report' },
        { value: 'Feature Request', label: 'Feature Request' },
        { value: 'General Inquiry', label: 'General Inquiry' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        const result = await submitSupportRequest({
            issueType,
            description
        });

        if (result.success) {
            setSuccessMessage(result.message || 'Request submitted successfully!');
            setIssueType('');
            setDescription('');
        } else if (result.errors) {
            // Ensure all values are strings, not undefined
            const errorObj: Record<string, string> = {};
            Object.entries(result.errors).forEach(([key, value]) => {
                if (value !== undefined) {
                    errorObj[key] = value;
                }
            });
            setErrors(errorObj);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        if (successMessage) {
            setShowSuccessAlert(true);
        } else {
            setShowSuccessAlert(false);
        }
    }, [successMessage]);

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="support-container">
                    <h1>Support Center</h1>

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

                    <div className="support-form-section">
                        <p>Use the form below to submit a support request and we'll get back to you as soon as possible.</p>
                        <div className="additional-links-section">
                            <h3>Additional Links</h3>
                            <ul>
                                <li><a href="/privacy-policy">Privacy Policy</a></li>
                                <li><a href="/terms-of-service">Terms of Service</a></li>
                                <li><a href="/community-guidelines">Community Guidelines</a></li>
                            </ul>
                        </div>
                        <form onSubmit={handleSubmit} className="support-form">
                            <div className="form-section">
                                <div className={`input-container ${errors.issueType ? 'error' : ''}`}>
                                    <label htmlFor="issueType">Issue Type *</label>
                                    <select
                                        id="issueType"
                                        value={issueType}
                                        onChange={(e) => setIssueType(e.target.value)}
                                        className={errors.issueType ? 'error' : ''}
                                        required
                                    >
                                        <option value="">Select an issue type...</option>
                                        {issueTypeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.issueType && (
                                        <div className="error-message">{errors.issueType}</div>
                                    )}
                                </div>

                                <div className={`input-container ${errors.description ? 'error' : ''}`}>
                                    <label htmlFor="description">Description *</label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={errors.description ? 'error' : ''}
                                        placeholder="Please describe your issue or request in detail..."
                                        rows={6}
                                        required
                                        maxLength={2000}
                                    />
                                    <div className="character-counter">
                                        {description.length}/2000 characters
                                        {description.length > 0 && description.length < 10 && (
                                            <span className="min-warning"> (minimum 10 characters)</span>
                                        )}
                                    </div>
                                    {errors.description && (
                                        <div className="error-message">{errors.description}</div>
                                    )}
                                </div>

                                {errors.form && (
                                    <div className="error-message">{errors.form}</div>
                                )}

                                <div className="form-actions">
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
