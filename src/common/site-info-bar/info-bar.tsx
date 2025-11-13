'use client';

import './info-bar.scss';
import { useCurrentUser } from '../context/current-user-context';
import { resendVerificationEmail } from './info-bar.actions';
import { useState, useEffect } from 'react';
import { showAlert, userHasOnboarded } from '@/util';
import Link from 'next/link';

export default function InfoBar({ onHide }: { onHide?: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const currentUser = useCurrentUser();

    const onboardedResult = currentUser ? userHasOnboarded(currentUser) : null;

    useEffect(() => {
        if (onboardedResult?.hasOnboarded && onHide) {
            onHide();
        }
    }, [onboardedResult?.hasOnboarded, onHide]);

    if (!currentUser) {
        return null;
    }

    const handleResendVerificationEmail = async () => {
        try {
            setIsLoading(true);
            await resendVerificationEmail(currentUser.id, currentUser.email, currentUser.firstName, currentUser.lastName);
            showAlert('Your verification email has been resent.');
        } catch (e) {
            showAlert('An error occurred while re-sending verification email.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    if (onboardedResult?.hasOnboarded) {
        return null;
    }

    const InfoContent = () => {
        if (onboardedResult?.issues.profileCompletedAt) {
            return (
                <p>You will not be shown to other users until you have completed your profile. <Link
                    href={'/onboarding'} className='action-button'>{isLoading ? 'Please wait...' : 'Complete Profile'}</Link></p>
            );
        }

        if (onboardedResult?.issues.numOfPhotos) {
            return (
                <p>Your profile will not be shown until you have added at least 3 approved photos to your profile. <Link
                    href={'/profile/photos'} className='action-button'>{isLoading ? 'Please wait...' : 'Add Photos'}</Link></p>
            );
        }

        if (onboardedResult?.issues.emailVerifiedAt) {
            return (
                <p>Your profile will not be shown until you verify your email. <button disabled={isLoading}
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
