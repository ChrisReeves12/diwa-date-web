'use client';

import './login.scss';
import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { loginTitle, loginSubtitle } from '@/content/login-content';
import { AuthResponse } from '@/types/auth-response.interface';

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsLoading(true);

        try {
            const response = await fetch('/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data: AuthResponse = await response.json();

            if (!response.ok) {
                if (response.status === 422) {
                    // Validation errors
                    setErrors({
                        form: data.message || 'Please check your input'
                    });
                } else if (response.status === 401) {
                    // Authentication failed
                    setErrors({
                        form: data.message || 'Invalid email or password'
                    });
                } else {
                    // Other errors
                    setErrors({
                        form: data.message || 'An error occurred during login'
                    });
                }
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
                        <h1>{loginTitle}</h1>
                        <h4>{loginSubtitle}</h4>
                        <form onSubmit={handleSubmit}>
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
                                <a href="/forgot-password">Forgot Password?</a>
                            </div>

                            <div className="submit-button-wrapper">
                                <div className="form-row form-row-loader-container">
                                    <button
                                        className="btn-primary"
                                        type="submit"
                                        disabled={isLoading}
                                    >
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