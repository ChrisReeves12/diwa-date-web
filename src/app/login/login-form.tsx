'use client';

import './login.scss';
import React, { useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { loginTitle, loginSubtitle } from '@/content/login-content';
import { loginAction } from './login.actions';
import Link from 'next/link';
import { Alert, Button } from '@mui/material';

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'warning' | undefined>();

    useLayoutEffect(() => {
        setAlertMessage(window.localStorage.getItem('FlashSuccessMessage') || window.localStorage.getItem('FlashWarningMessage'));
        setAlertType(window.localStorage.getItem('FlashSuccessMessage') ? 'success' : 'warning');

        setTimeout(() => {
            window.localStorage.removeItem('FlashSuccessMessage');
            window.localStorage.removeItem('FlashWarningMessage');
        }, 500);
    }, []);

    function onCloseAlert(): void {
        window.localStorage.removeItem('FlashSuccessMessage');
        window.localStorage.removeItem('FlashWarningMessage');
        setAlertMessage(null);
        setAlertType(undefined);
    }

    const handleSubmit = async (formData: FormData) => {
        setErrors({});
        setIsLoading(true);

        try {
            // Add email and password to the form data
            formData.set('email', email);
            formData.set('password', password);

            // Call the server action
            const result = await loginAction(formData);

            if (!result.success) {
                // Authentication failed
                setErrors({
                    form: result.message || 'Invalid email or password'
                });
                return;
            }

            // Login successful
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Login error:', error);
            setErrors({
                form: 'An unexpected error occurred'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="login-site-container">
            <div className="container">
                <div className="form-container">
                    <div className="form-section">
                        <div className="logo-container">
                            <Image
                                src="/images/blue_background_icon_logo.png"
                                alt="Logo"
                                width={80}
                                height={80}
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
                                    }
                                >
                                    {alertMessage}
                                </Alert>
                            </div>}
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
                                    <button
                                        className="btn-primary"
                                        type="submit"
                                        disabled={isLoading}>
                                        Sign In
                                    </button>
                                    <div className={`loader ${isLoading ? 'is-loading' : ''}`}>
                                        <i className="las la-spinner"></i>
                                    </div>
                                </div>
                            </div>
                        </form>
                        <div className="register-link">
                            Don&apos;t have an account? <a href="/registration">Register</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
