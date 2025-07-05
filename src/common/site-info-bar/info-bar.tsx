'use client';

import './info-bar.scss';
import { useCurrentUser } from '../context/current-user-context';
import { InfoCircleIcon } from 'react-line-awesome';
import { resendVerificationEmail } from './info-bar.actions';
import { useState } from 'react';
import { showAlert, userHasOnboarded } from '@/util';
import Link from 'next/link';

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
            showAlert('Your verification email has been resent.');
        } catch (e) {
            showAlert('An error occurred while re-sending verification email.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    const onboardedResult = userHasOnboarded(currentUser);

    if (onboardedResult.hasOnboarded) {
        return null;
    }

    const InfoContent = () => {
        if (onboardedResult.issues.emailVerifiedAt) {
            return (
                <p><InfoCircleIcon /> Your profile will not be shown until you verify your email. <button disabled={isLoading}
                    onClick={handleResendVerificationEmail} className='action-button'>{isLoading ? 'Please wait...' : 'Resend Email'}</button></p>
            );
        }

        if (onboardedResult.issues.numOfPhotos) {
            return (
                <p><InfoCircleIcon /> Your profile will not be shown until you have added at least 3 approved photos to your profile. <Link
                    href={'/profile/photos'} className='action-button'>{isLoading ? 'Please wait...' : 'Add Photos'}</Link></p>
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