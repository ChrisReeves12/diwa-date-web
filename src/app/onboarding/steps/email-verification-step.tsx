'use client';

import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { BsFillEnvelopeFill } from "react-icons/bs";
import Image from 'next/image';
import { resendVerificationEmail } from '../wizard-actions';

interface EmailVerificationStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
    userEmail: string;
    emailVerified: boolean;
}

export function EmailVerificationStep({ data, updateData, onValidationChange, userEmail, emailVerified }: EmailVerificationStepProps) {
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Mark as completed only if email is verified
    useEffect(() => {
        onValidationChange(emailVerified);
    }, [emailVerified, onValidationChange]);

    const handleResendEmail = async () => {
        setIsResending(true);
        setResendMessage(null);

        try {
            const result = await resendVerificationEmail();

            if (result.success) {
                setResendMessage({ type: 'success', text: 'Verification email has been resent! Please check your inbox.' });
            } else {
                setResendMessage({ type: 'error', text: result.message || 'Failed to resend email. Please try again.' });
            }
        } catch (error) {
            setResendMessage({ type: 'error', text: 'An error occurred. Please try again later.' });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="wizard-step email-verification-step">
            <div className="logo-container">
                <Image
                    src="/images/logo_square_bkg.svg"
                    alt="Logo"
                    width={90}
                    height={90}
                    priority
                />
            </div>
            <div className="step-header">
                <h2>Verify Your Email</h2>
                {emailVerified ? (
                    <p className="step-description">
                        Your email <strong>{userEmail}</strong> has been successfully verified! ✓
                    </p>
                ) : (
                    <p className="step-description">
                        We&apos;ve sent a verification email to <strong>{userEmail}</strong>.
                        Please check your inbox and click the verification link to complete your email verification.
                    </p>
                )}
            </div>

            <div className="step-content">
                {emailVerified ? (
                    <div className="email-verification-section">
                        <div className="verification-info verified">
                            <div className="info-icon">
                                <BsFillEnvelopeFill className='icon verified' />
                            </div>
                            <div className="info-text">
                                <p>
                                    <strong>Email verified successfully!</strong>
                                </p>
                                <p>
                                    You can now continue setting up your profile.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="email-verification-section">
                        <div className="verification-info">
                            <div className="info-icon">
                                <BsFillEnvelopeFill className='icon' />
                            </div>
                            <div className="info-text">
                                <p>
                                    If you don&apos;t see the email, please check your spam or junk folder.
                                </p>
                                <p>
                                    You can continue setting up your profile now and verify your email later.
                                </p>
                            </div>
                        </div>

                        <div className="resend-section">
                            <button
                                type="button"
                                onClick={handleResendEmail}
                                disabled={isResending}
                                className="btn-secondary resend-button"
                            >
                                {isResending ? 'Sending...' : 'Resend Verification Email'}
                            </button>

                            {resendMessage && (
                                <div className={`resend-message ${resendMessage.type}`}>
                                    {resendMessage.text}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

