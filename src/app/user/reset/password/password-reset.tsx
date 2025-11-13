'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestPasswordReset, resetPassword } from '@/app/user/reset/reset.actions';

interface PasswordResetProps {
    token?: string;
}

export function PasswordReset({ token }: PasswordResetProps) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        if (!email.trim()) {
            setError('Please enter your email address.');
            setIsLoading(false);
            return;
        }

        try {
            const result = await requestPasswordReset(email);
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess('A password reset link has been sent to your email address.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!password.trim()) {
            setError('Please enter a new password.');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            setIsLoading(false);
            return;
        }

        try {
            const result = await resetPassword(password, token!);
            if (result.error) {
                setError(result.error);
            } else {
                window.localStorage.setItem('FlashSuccessMessage', 'Your password has been successfully reset. You can now log in with your new password.');
                router.push('/login');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // If token is provided, show password reset form
    if (token) {
        return (
            <div className="password-reset-container">
                <div className="password-reset-form">
                    <h2>Reset Your Password</h2>
                    <p>Enter your new password below.</p>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handlePasswordReset}>
                        <div className="form-group">
                            <label htmlFor="password">New Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                required
                                minLength={8}
                            />
                        </div>

                        <button type="submit" disabled={isLoading} className="submit-btn">
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Otherwise, show email entry form
    return (
        <div className="password-reset-container">
            <div className="password-reset-form">
                <h2>Reset Your Password</h2>
                <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleEmailSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="submit-btn">
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="form-links">
                    <a href="/login">Back to Login</a>
                </div>
            </div>
        </div>
    );
} 