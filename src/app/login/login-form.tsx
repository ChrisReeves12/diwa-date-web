'use client';

import './login.scss';
import React, { useLayoutEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { loginSubtitle, loginTitle } from '@/content/login-content';
import { loginAction, verifyTwoFactorCodeAction, resendTwoFactorCodeAction } from './login.actions';
import { getGoogleSignInUrl } from './google-login.actions';
import Link from 'next/link';
import { Alert, Button, CircularProgress } from '@mui/material';
import { getCookieConsentStatus } from '@/common/cookie-consent';

// @ts-ignore
import { getCurrentBrowserFingerPrint } from "@rajesh896/broprint.js";

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // 2FA state
    const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorMessage, setTwoFactorMessage] = useState('');
    const [isResendingCode, setIsResendingCode] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'warning' | undefined>();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    useLayoutEffect(() => {
        setAlertMessage(window.localStorage.getItem('FlashSuccessMessage') || window.localStorage.getItem('FlashWarningMessage'));
        setAlertType(window.localStorage.getItem('FlashSuccessMessage') ? 'success' : 'warning');

        setTimeout(() => {
            window.localStorage.removeItem('FlashSuccessMessage');
            window.localStorage.removeItem('FlashWarningMessage');
        }, 500);
    }, []);

    // Cooldown timer effect
    React.useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    function onCloseAlert(): void {
        window.localStorage.removeItem('FlashSuccessMessage');
        window.localStorage.removeItem('FlashWarningMessage');
        setAlertMessage(null);
        setAlertType(undefined);
    }

    const handleSubmit = async (formData: FormData) => {
        setErrors({});
        setIsLoading(true);

        setTimeout(async () => {
            try {
                // Add email and password to the form data
                formData.set('email', email);
                formData.set('password', password);

                // Add cookie consent status to form data
                const consentStatus = getCookieConsentStatus();
                formData.set('cookieConsent', consentStatus || 'null');

                const fingerprint = await getCurrentBrowserFingerPrint();
                const cookies = document.cookie;
                const userAgent = navigator.userAgent;

                formData.set('browserFingerprint', fingerprint);
                formData.set('browserCookies', cookies);
                formData.set('browserUserAgent', userAgent);

                // Call the server action
                const result = await loginAction(formData);

                if (!result.success) {
                    // Check if 2FA is required
                    if (result.requiresTwoFactor && result.userId) {
                        setRequiresTwoFactor(true);
                        setUserId(result.userId);
                        setTwoFactorMessage(result.twoFactorMessage || 'A verification code has been sent to your email.');
                        setIsLoading(false);
                        return;
                    }

                    // Authentication failed
                    setErrors({
                        form: result.message || 'Invalid email or password'
                    });

                    setIsLoading(false);
                    return;
                }

                // Login successful - redirect to intended page or home
                router.push(redirectTo || '/');
                router.refresh();
            } catch (error) {
                console.error('Login error:', error);
                setErrors({
                    form: 'An unexpected error occurred'
                });

                setIsLoading(false);
            }

        }, 500);
    };

    const handleTwoFactorSubmit = async (formData: FormData) => {
        if (!userId) return;

        setErrors({});
        setIsLoading(true);

        try {
            formData.set('userId', userId.toString());
            formData.set('code', twoFactorCode);

            // Add cookie consent status to form data
            const consentStatus = getCookieConsentStatus();
            formData.set('cookieConsent', consentStatus || 'null');

            // Add browser fingerprint data
            const fingerprint = await getCurrentBrowserFingerPrint();
            const cookies = document.cookie;
            const userAgent = navigator.userAgent;

            formData.set('browserFingerprint', fingerprint);
            formData.set('browserCookies', cookies);
            formData.set('browserUserAgent', userAgent);

            const result = await verifyTwoFactorCodeAction(formData);

            if (!result.success) {
                setErrors({
                    form: result.message || 'Invalid verification code'
                });
                setIsLoading(false);
                return;
            }

            // 2FA verification successful - redirect
            router.push(redirectTo || '/');
            router.refresh();
        } catch (error) {
            console.error('2FA verification error:', error);
            setErrors({
                form: 'An unexpected error occurred'
            });
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!userId || isResendingCode || resendCooldown > 0) return;

        setIsResendingCode(true);
        setErrors({});

        try {
            const formData = new FormData();
            formData.set('userId', userId.toString());

            const result = await resendTwoFactorCodeAction(formData);

            if (!result.success) {
                setErrors({
                    form: result.message || 'Failed to resend code'
                });
            } else {
                setTwoFactorMessage(result.message);
                setResendCooldown(60); // 60 second cooldown
            }
        } catch (error) {
            console.error('Resend code error:', error);
            setErrors({
                form: 'An unexpected error occurred'
            });
        } finally {
            setIsResendingCode(false);
        }
    };

    const handleBackToLogin = () => {
        setRequiresTwoFactor(false);
        setUserId(null);
        setTwoFactorCode('');
        setTwoFactorMessage('');
        setErrors({});
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            const googleSignInUrl = await getGoogleSignInUrl();
            window.location.href = googleSignInUrl;
        } catch (error) {
            console.error('Failed to initiate Google sign in:', error);
            setErrors({
                form: 'Failed to initiate Google sign in. Please try again.'
            });
            setIsGoogleLoading(false);
        }
    };

    const formatTwoFactorCode = (value: string) => {
        // Remove non-digits and limit to 6 characters
        const digits = value.replace(/\D/g, '').substring(0, 6);
        // Format as XXX-XXX
        if (digits.length > 3) {
            return digits.substring(0, 3) + '-' + digits.substring(3);
        }
        return digits;
    };

    const handleTwoFactorCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatTwoFactorCode(e.target.value);
        setTwoFactorCode(formatted);
    };

    return (
        <div className="login-site-container">
            <div className="container">
                <div className="form-container">
                    <div className="form-section">
                        <div className="logo-container">
                            <Image
                                src="/images/logo_square_bkg.svg"
                                alt="Logo"
                                width={90}
                                height={90}
                                priority
                            />
                        </div>
                        {alertMessage && alertType &&
                            <div className='container'>
                                <Alert
                                    severity={alertType}
                                    action={
                                        <Button onClick={onCloseAlert} color="inherit" size="small">
                                            Dismiss
                                        </Button>
                                    }>
                                    {alertMessage}
                                </Alert>
                            </div>}

                        {requiresTwoFactor ? (
                            <>
                                <h1>Two-Factor Authentication</h1>
                                <h4>Enter the verification code sent to your email</h4>
                                <div className="two-factor-info">
                                    <p>{twoFactorMessage}</p>
                                </div>
                                <form action={handleTwoFactorSubmit}>
                                    <div className="form-row">
                                        <div className={`input-container ${errors.code ? 'error' : ''}`}>
                                            <label htmlFor="twoFactorCode">Verification Code</label>
                                            <input
                                                type="text"
                                                id="twoFactorCode"
                                                name="twoFactorCode"
                                                value={twoFactorCode}
                                                onChange={handleTwoFactorCodeChange}
                                                className={`two-factor-input ${errors.code ? 'error' : ''}`}
                                                placeholder="000-000"
                                                maxLength={7}
                                                autoComplete="one-time-code"
                                                autoFocus
                                                required
                                            />
                                            {errors.code && (
                                                <div className="error-message">{errors.code}</div>
                                            )}
                                        </div>
                                    </div>

                                    {errors.form && (
                                        <div className="form-row">
                                            <div className="error-message">{errors.form}</div>
                                        </div>
                                    )}

                                    <div className="two-factor-actions">
                                        <div className="resend-code-section">
                                            <p>Didn&apos;t receive a code?</p>
                                            <button
                                                type="button"
                                                className="link-button"
                                                onClick={handleResendCode}
                                                disabled={isResendingCode || resendCooldown > 0}>
                                                {isResendingCode ? 'Sending...' :
                                                    resendCooldown > 0 ? `Resend in ${resendCooldown}s` :
                                                        'Resend Code'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="submit-button-wrapper">
                                        <div className="form-row form-row-loader-container">
                                            {isLoading ? <CircularProgress sx={{ color: "primary.main" }} /> :
                                                <button
                                                    className="btn-primary"
                                                    type="submit"
                                                    disabled={twoFactorCode.replace('-', '').length !== 6}
                                                >
                                                    Verify Code
                                                </button>
                                            }
                                        </div>
                                    </div>

                                    <div className="back-to-login">
                                        <button
                                            type="button"
                                            className="link-button"
                                            onClick={handleBackToLogin}
                                        >
                                            ← Back to Login
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                <h1>{loginTitle}</h1>
                                <h4>{loginSubtitle}</h4>
                                <form action={handleSubmit}>
                                    <div className="form-row">
                                        <div className={`input-container ${errors.email ? 'error' : ''}`}>
                                            <label htmlFor="email">Email</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className={errors.email ? 'error' : ''}
                                                required
                                            />
                                            {errors.email && (
                                                <div className="error-message">{errors.email}</div>
                                            )}
                                        </div>
                                    </div>

                                    {errors.form && (
                                        <div className="form-row">
                                            <div className="error-message">{errors.form}</div>
                                        </div>
                                    )}

                                    <div className="form-row">
                                        <div className={`input-container ${errors.password ? 'error' : ''}`}>
                                            <label htmlFor="password">Password</label>
                                            <div className="password-input-wrapper">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    id="password"
                                                    name="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className={errors.password ? 'error' : ''}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle"
                                                    onClick={togglePasswordVisibility}
                                                    tabIndex={-1}
                                                >
                                                    <i className={`las ${showPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                </button>
                                            </div>
                                            {errors.password && (
                                                <div className="error-message">{errors.password}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="forgot-password-link">
                                        <Link href="/user/reset/password">Forgot Password?</Link>
                                    </div>

                                    <div className="submit-button-wrapper">
                                        <div className="form-row form-row-loader-container">
                                            {isLoading ? <CircularProgress sx={{ color: "primary.main" }} /> : <button
                                                className="btn-primary"
                                                type="submit">
                                                Sign In
                                            </button>}
                                        </div>
                                    </div>
                                </form>

                                <div className="divider">
                                    <span>or</span>
                                </div>

                                <div className="social-signin-container">
                                    <button
                                        type="button"
                                        className="btn-google"
                                        onClick={handleGoogleSignIn}
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
                                                Continue with Google
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="register-link">
                                    Don&apos;t have an account? <a href="/registration">Register</a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
