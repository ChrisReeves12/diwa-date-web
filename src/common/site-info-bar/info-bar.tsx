'use client';

import './info-bar.scss';
import { useCurrentUser } from '../context/current-user-context';
import { InfoCircleIcon } from 'react-line-awesome';
import { resendVerificationEmail } from './info-bar.actions';
import { useState } from 'react';

export default function InfoBar() {
    const [isLoading, setIsLoading] = useState(false);
    const currentUser = useCurrentUser();

    if (!currentUser) {
        return null;
    }

    const handleResendVerificationEmail = async () => {
        try {
            setIsLoading(true);
            await resendVerificationEmail(currentUser.id);
            alert('Your verification email has been resent.');
        } catch (e) {
            alert('An error occurred while re-sending verification email.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    const InfoContent = () => {
        if (!currentUser.emailVerifiedAt) {
            return (
                <p><InfoCircleIcon /> Your profile will not be shown until you verify your email. <button disabled={isLoading}
                    onClick={handleResendVerificationEmail} className='action-button'>{isLoading ? 'Please wait...' : 'Resend Email'}</button></p>
            );
        }
    };

    return (
        <div className="site-info-bar">
            <div className="info-bar-content">
                <div className="container">
                    <InfoContent />
                </div>
            </div>
        </div>
    );
} 