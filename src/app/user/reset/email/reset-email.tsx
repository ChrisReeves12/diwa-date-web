'use client';

import React, { useState } from "react";
import { resetUserEmail } from "@/app/user/reset/reset.actions";
import { useRouter } from "next/navigation";
import { showAlert } from '@/util';

interface ResetEmailProps {
    newEmail: string,
    token: string,
}

export function ResetEmail({ newEmail, token }: ResetEmailProps) {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>();
    const [password, setPassword] = useState<string>('');
    const router = useRouter();

    async function handleSubmit(e: any) {
        e.preventDefault();

        setIsLoading(true);
        setError(undefined);

        try {
            const result = await resetUserEmail(password, token);
            if (result.error) {
                setError(result.error);
            } else {
                router.replace('/account/settings');
            }
        } catch (e: any) {
            console.error(e);
            showAlert('An error occurred while updating your email address, please try again later.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="user-email-reset-container">
            <div className="container">
                <h2>Email Update</h2>
                <p>Please confirm the update to the email on your account by entering your password below.</p>
                <div className="form-container">
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="input-container">
                                <strong>New Email</strong>: {newEmail}
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="input-container">
                                <label htmlFor="password">Password</label>
                                <input value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required={true} name="password" type="password" />
                                {error && <div className="error-message">{error}</div>}
                            </div>
                        </div>
                        <div className="form-row">
                            <button
                                className="btn-primary"
                                disabled={isLoading}
                                type="submit">
                                {isLoading ? 'Please wait...' : 'Update Email'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
