'use client';

import { useState, useEffect } from 'react';
import { WizardData } from '../wizard-container';
import { BsFillEnvelopeFill } from "react-icons/bs";
import { resendVerificationEmail, verifyEmailCode } from '../wizard-actions';

interface EmailVerificationStepProps {
    data: WizardData;
    updateData: (field: keyof WizardData, value: any) => void;
    onValidationChange: (isValid: boolean) => void;
    userEmail: string;
    emailVerified: boolean;
}

export function EmailVerificationStep({
                                          data,
                                          updateData,
                                          onValidationChange,
                                          userEmail,
                                          emailVerified
                                      }: EmailVerificationStepProps) {
    const [isResending, setIsResending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isLocallyVerified, setIsLocallyVerified] = useState(emailVerified);

    // Mark as completed only if email is verified
    useEffect(() => {
        onValidationChange(isLocallyVerified);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLocallyVerified]);

    const handleResendEmail = async () => {
        setIsResending(true);
        setResendMessage(null);
        setVerifyMessage(null);

        try {
            const result = await resendVerificationEmail();

            if (result.success) {
                setResendMessage({type: 'success', text: 'Verification code has been sent to your email!'});
            } else {
                setResendMessage({
                    type: 'error',
                    text: result.message || 'Failed to send verification code. Please try again.'
                });
            }
        } catch (error) {
            setResendMessage({type: 'error', text: 'An error occurred. Please try again later.'});
        } finally {
            setIsResending(false);
        }
    };

    const handleVerifyCode = async () => {
        if (verificationCode.length !== 6) {
            setVerifyMessage({type: 'error', text: 'Please enter a 6-digit code'});
            return;
        }

        setIsVerifying(true);
        setVerifyMessage(null);

        try {
            const result = await verifyEmailCode(verificationCode);

            if (result.success) {
                setVerifyMessage({type: 'success', text: result.message || 'Email verified successfully!'});
                setIsLocallyVerified(true);
                setVerificationCode('');
            } else {
                setVerifyMessage({
                    type: 'error',
                    text: result.message || 'Invalid verification code. Please try again.'
                });
            }
        } catch (error) {
            setVerifyMessage({type: 'error', text: 'An error occurred. Please try again later.'});
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setVerificationCode(value);
        setVerifyMessage(null);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && verificationCode.length === 6) {
            handleVerifyCode();
        }
    };

    return (
        <div className="wizard-step email-verification-step">
            <div className="step-header">
                <h2>Verify Your Email</h2>
                {isLocallyVerified &&
                    <p className="step-description">
                        Your email <strong>{userEmail}</strong> has been successfully verified! ✓
                    </p>}
            </div>

            <div className="step-content">
                {isLocallyVerified ? (
                    <div className="email-verification-section">
                        <div className="verification-info verified">
                            <div className="info-icon">
                                <BsFillEnvelopeFill className='icon verified'/>
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
                                <BsFillEnvelopeFill className='icon'/>
                            </div>
                            <div className="info-text">
                                <p>
                                    Please enter the code we sent to <strong>{userEmail}</strong>. If you don&apos;t see
                                    the email, please check your spam or junk folder.
                                </p>
                                <p>
                                    The code will expire in 20 minutes.
                                </p>
                            </div>
                        </div>

                        <div className="code-input-section">
                            <label htmlFor="verification-code">Enter 6-digit code:</label>
                            <input
                                id="verification-code"
                                type="text"
                                inputMode="numeric"
                                pattern="\d{6}"
                                maxLength={6}
                                value={verificationCode}
                                onChange={handleCodeChange}
                                onKeyPress={handleKeyPress}
                                placeholder="000000"
                                className="code-input"
                                disabled={isVerifying}
                            />
                            <div className="button-container">
                                <button
                                    type="button"
                                    onClick={handleVerifyCode}
                                    disabled={isVerifying || verificationCode.length !== 6}
                                    className="btn-primary verify-button">
                                    {isVerifying ? 'Verifying...' : 'Verify Code'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendEmail}
                                    disabled={isResending}
                                    className="btn-secondary resend-button"
                                >
                                    {isResending ? 'Sending...' : 'Resend Code'}
                                </button>
                            </div>

                            {verifyMessage && (
                                <div className={`verify-message ${verifyMessage.type}`}>
                                    {verifyMessage.text}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
