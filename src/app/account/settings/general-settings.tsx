'use client';

import { User } from "@/types";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { AccountSettingsTabs } from "@/app/account/account-settings-tabs";
import { updatePassword, toggleAccountDeactivation, deleteAccount, getBlockedUsersList, unblockUser, updateEmail, enableTwoFactor, disableTwoFactor, requestAccountDeletionCode, deleteAccountWithCode } from "@/common/server-actions/user.actions";
import React, { useState, useEffect } from "react";
import { UserPreview } from "@/types";
import ConfirmDialog from "@/common/confirm-dialog/confirm-dialog";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";

interface AccountSettingsProps {
    currentUser?: User
}

export function GeneralSettings({ currentUser }: AccountSettingsProps) {
    const isSignedInWithGoogle = !!currentUser?.googleId;
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Email form state
    const [newEmail, setNewEmail] = useState('');
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Account deactivation state
    const [isDeactivated, setIsDeactivated] = useState(!!currentUser?.deactivatedAt);

    // Delete account state
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    const [deletionCode, setDeletionCode] = useState('');
    const [isSendingDeletionCode, setIsSendingDeletionCode] = useState(false);
    const [isDeletionCodeSent, setIsDeletionCodeSent] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Blocked users state
    const [blockedUsers, setBlockedUsers] = useState<UserPreview[]>([]);
    const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = useState(true);
    const [unblockingUserId, setUnblockingUserId] = useState<number | null>(null);

    // 2FA state
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!currentUser?.require2fa);
    const [isUpdatingTwoFactor, setIsUpdatingTwoFactor] = useState(false);

    // Profile deactivation confirmation dialog state
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

    // Browser notifications state
    const { isSupported: notificationsSupported, isEnabled: notificationsEnabled, permission: notificationPermission, toggleNotifications } = useBrowserNotifications();
    const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

    // Load blocked users on component mount
    useEffect(() => {
        const loadBlockedUsers = async () => {
            try {
                const users = await getBlockedUsersList();
                setBlockedUsers(users);
            } catch (error) {
                console.error('Failed to load blocked users:', error);
            } finally {
                setIsLoadingBlockedUsers(false);
            }
        };

        loadBlockedUsers();
    }, []);

    const handleUnblockUser = async (userId: number) => {
        setUnblockingUserId(userId);
        setErrors({});
        setSuccessMessage('');

        try {
            const result = await unblockUser(userId);

            if (!result.success) {
                setErrors({ form: result.error || 'Failed to unblock user' });
                return;
            }

            // Remove the user from the blocked users list
            setBlockedUsers(prev => prev.filter(user => user.id !== userId));
            setSuccessMessage('User unblocked successfully');
        } catch (error) {
            console.error('Unblock user error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        } finally {
            setUnblockingUserId(null);
        }
    };

    const handleEmailUpdate = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsUpdatingEmail(true);

        try {
            // Client-side validation
            if (!newEmail.trim()) {
                setErrors({ newEmail: 'Email is required' });
                return;
            }

            if (!/\S+@\S+\.\S+/.test(newEmail)) {
                setErrors({ newEmail: 'Email format is invalid' });
                return;
            }

            // Call server action
            const result = await updateEmail(newEmail);

            if (!result.success) {
                setErrors({ emailForm: result.error || 'Failed to send verification email' });
                return;
            }

            // Success
            setSuccessMessage('Verification email sent! Please check your new email address and click the verification link to complete the email change.');
            setNewEmail('');
        } catch (error) {
            console.error('Email update error:', error);
            setErrors({ emailForm: 'An unexpected error occurred' });
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handlePasswordSubmit = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsLoading(true);

        try {
            // Client-side validation
            if (!currentPassword) {
                setErrors({ currentPassword: 'Current password is required' });
                return;
            }

            if (!newPassword) {
                setErrors({ newPassword: 'New password is required' });
                return;
            }

            if (newPassword !== confirmPassword) {
                setErrors({ confirmPassword: 'Passwords do not match' });
                return;
            }

            if (newPassword.length < 8) {
                setErrors({ newPassword: 'Password must be at least 8 characters long' });
                return;
            }

            if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
                setErrors({ newPassword: 'Password must contain at least one special character' });
                return;
            }

            // Call server action
            const result = await updatePassword(currentPassword, newPassword);

            if (!result.success) {
                setErrors({ form: result.error || 'Failed to update password' });
                return;
            }

            // Success
            setSuccessMessage('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Password update error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccountDeactivation = async () => {
        const shouldDeactivate = !isDeactivated;

        // Show confirmation dialog only when deactivating
        if (shouldDeactivate) {
            setShowDeactivateConfirm(true);
        } else {
            // Reactivating doesn't need confirmation
            await performAccountDeactivation(shouldDeactivate);
        }
    };

    const performAccountDeactivation = async (shouldDeactivate: boolean) => {
        setErrors({});
        setSuccessMessage('');
        setIsLoading(true);
        setShowDeactivateConfirm(false);

        try {
            const result = await toggleAccountDeactivation(shouldDeactivate);

            if (!result.success) {
                setErrors({ form: result.error || 'Failed to update account status' });
                return;
            }

            setIsDeactivated(shouldDeactivate);
            setSuccessMessage(
                shouldDeactivate
                    ? 'Profile turned off successfully'
                    : 'Profile turned on successfully'
            );
        } catch (error) {
            console.error('Account deactivation error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTwoFactorToggle = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsUpdatingTwoFactor(true);

        try {
            let result;
            if (twoFactorEnabled) {
                // Disable 2FA
                const confirmed = window.confirm(
                    'Are you sure you want to disable two-factor authentication? This will make your account less secure.'
                );
                if (!confirmed) {
                    setIsUpdatingTwoFactor(false);
                    return;
                }
                result = await disableTwoFactor('');
            } else {
                // Enable 2FA
                result = await enableTwoFactor('');
            }

            if (!result.success) {
                setErrors({ twoFactorForm: result.error || 'Failed to update two-factor authentication' });
                return;
            }

            // Success
            setTwoFactorEnabled(!twoFactorEnabled);
            setSuccessMessage(result.message || 'Two-factor authentication updated successfully');
        } catch (error) {
            console.error('2FA toggle error:', error);
            setErrors({ twoFactorForm: 'An unexpected error occurred' });
        } finally {
            setIsUpdatingTwoFactor(false);
        }
    };

    const handleBrowserNotificationsToggle = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsUpdatingNotifications(true);

        try {
            const enabled = await toggleNotifications();

            if (enabled) {
                setSuccessMessage('Browser notifications enabled successfully');
            } else {
                setSuccessMessage('Browser notifications disabled');
            }
        } catch (error) {
            console.error('Browser notifications toggle error:', error);
            setErrors({ notificationsForm: 'An unexpected error occurred' });
        } finally {
            setIsUpdatingNotifications(false);
        }
    };

    const handleSendDeletionCode = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsSendingDeletionCode(true);
        try {
            const result = await requestAccountDeletionCode();
            if (!result.success) {
                setErrors({ deleteForm: result.error || 'Failed to send verification code' });
                return;
            }
            setIsDeletionCodeSent(true);
            setSuccessMessage('Verification code sent to your email');
        } catch (error) {
            setErrors({ deleteForm: 'An unexpected error occurred' });
        } finally {
            setIsSendingDeletionCode(false);
        }
    };

    const handleAccountDeletion = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsDeleting(true);

        try {
            if (isSignedInWithGoogle) {
                if (!deletionCode || deletionCode.trim().length !== 6) {
                    setErrors({ deletionCode: '6-digit code is required to delete your account' });
                    return;
                }
            } else {
                if (!deletePassword) {
                    setErrors({ deletePassword: 'Password is required to delete your account' });
                    return;
                }
            }

            const firstConfirm = window.confirm(
                'Are you absolutely sure you want to permanently delete your account? This action cannot be undone.'
            );

            if (!firstConfirm) {
                setIsDeleting(false);
                return;
            }

            const secondConfirm = window.confirm(
                'This will permanently delete:\n\n' +
                '• Your profile and all personal information\n' +
                '• All your photos and messages\n' +
                '• Your matches and conversation history\n' +
                '• Your subscription and billing information\n\n' +
                'Are you sure you want to continue?'
            );

            if (!secondConfirm) {
                setIsDeleting(false);
                return;
            }

            let result;
            if (isSignedInWithGoogle) {
                result = await deleteAccountWithCode(deletionCode.trim());
            } else {
                result = await deleteAccount(deletePassword);
            }

            if (!result.success) {
                setErrors({ deleteForm: result.error || 'Failed to delete account' });
                return;
            }

            // If we reach here, the account was successfully deleted
            window.location.reload();
        } catch (error) {
            console.error('Account deletion error:', error);
            setErrors({ deleteForm: 'An unexpected error occurred' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="account-settings-form-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <h2>General Settings</h2>
                        <AccountSettingsTabs selectedTab={'user-settings'} />
                        <div className="security-settings">

                            {/* Success Message */}
                            {successMessage && (
                                <div className="success-message">
                                    {successMessage}
                                </div>
                            )}

                            {/* General Form Errors */}
                            {errors.form && (
                                <div className="error-message">
                                    {errors.form}
                                </div>
                            )}

                            {/* Email Update Section */}
                            {!isSignedInWithGoogle && (
                                <div className="settings-section full-width">
                                <h3>Update Email Address</h3>
                                <div className="email-update-container">
                                    <div className="current-email-info">
                                        <p><strong>Current Email:</strong> {currentUser?.email}</p>
                                        <p>To change your email address, enter your new email below. You&apos;ll receive a verification email at the new address.</p>
                                    </div>

                                    {/* Email Form Errors */}
                                    {errors.emailForm && (
                                        <div className="error-message">
                                            {errors.emailForm}
                                        </div>
                                    )}

                                    <form onSubmit={(e) => { e.preventDefault(); handleEmailUpdate(); }}>
                                        <div className="form-row">
                                            <div className={`input-container ${errors.newEmail ? 'error' : ''}`}>
                                                <label htmlFor="newEmail">New Email Address</label>
                                                <input
                                                    type="email"
                                                    id="newEmail"
                                                    name="newEmail"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className={errors.newEmail ? 'error' : ''}
                                                    placeholder="Enter your new email address"
                                                    required
                                                />
                                                {errors.newEmail && (
                                                    <div className="error-message">{errors.newEmail}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <button
                                                className="btn-primary"
                                                type="submit"
                                                disabled={isUpdatingEmail || !newEmail.trim()}
                                            >
                                                {isUpdatingEmail ? 'Sending Verification...' : 'Send Verification Email'}
                                            </button>
                                        </div>
                                    </form>

                                    <div className="email-update-warning">
                                        <p><strong>Important:</strong></p>
                                        <ul>
                                            <li>Your email will not be changed until you verify the new address</li>
                                            <li>You&apos;ll receive a verification email at your new email address</li>
                                            <li>You&apos;ll need to enter your current password to complete the change</li>
                                            <li>You can continue using your current email until verification is complete</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* Side by side sections */}
                            <div className="settings-row">
                                {/* Password Change Section */}
                                <div className="settings-section">
                                    <h3>Change Password</h3>
                                    <form action={handlePasswordSubmit}>
                                        <div className="form-row">
                                            <div className={`input-container ${errors.currentPassword ? 'error' : ''}`}>
                                                <label htmlFor="currentPassword">Current Password</label>
                                                <div className="password-input-wrapper">
                                                    <input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        id="currentPassword"
                                                        name="currentPassword"
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                        className={errors.currentPassword ? 'error' : ''}
                                                        disabled={isSignedInWithGoogle}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        tabIndex={-1}
                                                        disabled={isSignedInWithGoogle}
                                                    >
                                                        <i className={`las ${showCurrentPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                    </button>
                                                </div>
                                                {errors.currentPassword && (
                                                    <div className="error-message">{errors.currentPassword}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className={`input-container ${errors.newPassword ? 'error' : ''}`}>
                                                <label htmlFor="newPassword">New Password</label>
                                                <div className="password-input-wrapper">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        id="newPassword"
                                                        name="newPassword"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className={errors.newPassword ? 'error' : ''}
                                                        disabled={isSignedInWithGoogle}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        tabIndex={-1}
                                                        disabled={isSignedInWithGoogle}
                                                    >
                                                        <i className={`las ${showNewPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                    </button>
                                                </div>
                                                {errors.newPassword && (
                                                    <div className="error-message">{errors.newPassword}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className={`input-container ${errors.confirmPassword ? 'error' : ''}`}>
                                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                                <div className="password-input-wrapper">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        id="confirmPassword"
                                                        name="confirmPassword"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className={errors.confirmPassword ? 'error' : ''}
                                                        disabled={isSignedInWithGoogle}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        tabIndex={-1}
                                                        disabled={isSignedInWithGoogle}
                                                    >
                                                        <i className={`las ${showConfirmPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                    </button>
                                                </div>
                                                {errors.confirmPassword && (
                                                    <div className="error-message">{errors.confirmPassword}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <button
                                                className="btn-primary"
                                                type="submit"
                                                disabled={isLoading || isSignedInWithGoogle}
                                            >
                                                {isLoading ? 'Updating...' : 'Update Password'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Two-Factor Authentication Section */}
                                <div className="settings-section">
                                    <h3>Two-Factor Authentication</h3>
                                    <div className="two-factor-container">
                                        <div className="two-factor-toggle-section">
                                            <div className="toggle-header">
                                                <div className="toggle-info">
                                                    <h4>Enable Two-Factor Authentication</h4>
                                                    <p>Add an extra layer of security to your account by requiring a verification code sent to your email when logging in.</p>
                                                </div>
                                                <div className="toggle-switch-container">
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            checked={twoFactorEnabled}
                                                            onChange={handleTwoFactorToggle}
                                                            disabled={isUpdatingTwoFactor || isSignedInWithGoogle}
                                                        />
                                                        <span className="toggle-slider"></span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* 2FA Form Errors */}
                                            {errors.twoFactorForm && (
                                                <div className="error-message">
                                                    {errors.twoFactorForm}
                                                </div>
                                            )}

                                            {isSignedInWithGoogle ? (
                                                <div className="disabled-notice">
                                                    <p className="security-warning">
                                                        <i className="las la-info-circle"></i>
                                                        Your authentication is handled by Google Sign In. Two-factor authentication is not required.
                                                    </p>
                                                </div>
                                            ) : (
                                                twoFactorEnabled ? (
                                                    <div className="enabled-notice">
                                                        <p className="security-notice">
                                                            <i className="las la-shield-alt"></i>
                                                            Two-factor authentication is enabled. Your account is more secure.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="disabled-notice">
                                                        <p className="security-warning">
                                                            <i className="las la-exclamation-triangle"></i>
                                                            Two-factor authentication is disabled. Enable it to add an extra layer of security.
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div className="two-factor-info">
                                            <p><strong>How it works:</strong></p>
                                            <ul>
                                                <li>When you log in, you&apos;ll enter your email and password as usual</li>
                                                <li>We&apos;ll send a 6-digit verification code to your email address</li>
                                                <li>Enter the code to complete your login (codes expire after 5 minutes)</li>
                                                <li>You can request a new code if needed</li>
                                            </ul>
                                            <div className="security-benefits">
                                                <p><strong>Security Benefits:</strong></p>
                                                <ul>
                                                    <li><i className="las la-check"></i> Protects against password theft</li>
                                                    <li><i className="las la-check"></i> Prevents unauthorized access even if your password is compromised</li>
                                                    <li><i className="las la-check"></i> Adds an extra layer of account security</li>
                                                    <li><i className="las la-check"></i> Email-based codes are secure and convenient</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Browser Notifications Section */}
                                <div className="settings-section">
                                    <h3>Browser Notifications</h3>
                                    <div className="two-factor-container">
                                        <div className="two-factor-toggle-section">
                                            <div className="toggle-header">
                                                <div className="toggle-info">
                                                    <h4>Enable Browser Notifications</h4>
                                                    <p>Receive browser notifications for new matches and messages when you&apos;re away from the tab.</p>
                                                </div>
                                                <div className="toggle-switch-container">
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            checked={notificationsEnabled}
                                                            onChange={handleBrowserNotificationsToggle}
                                                            disabled={isUpdatingNotifications || !notificationsSupported}
                                                        />
                                                        <span className="toggle-slider"></span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Notifications Form Errors */}
                                            {errors.notificationsForm && (
                                                <div className="error-message">
                                                    {errors.notificationsForm}
                                                </div>
                                            )}

                                            {!notificationsSupported ? (
                                                <div className="disabled-notice">
                                                    <p className="security-warning">
                                                        <i className="las la-exclamation-triangle"></i>
                                                        Your browser does not support notifications.
                                                    </p>
                                                </div>
                                            ) : notificationPermission === 'denied' ? (
                                                <div className="disabled-notice">
                                                    <p className="security-warning">
                                                        <i className="las la-exclamation-triangle"></i>
                                                        Browser notifications are blocked. To enable them, please update your browser settings to allow notifications for this site.
                                                    </p>
                                                </div>
                                            ) : notificationsEnabled ? (
                                                <div className="enabled-notice">
                                                    <p className="security-notice">
                                                        <i className="las la-bell"></i>
                                                        Browser notifications are enabled. You&apos;ll be notified when you receive matches and messages.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="disabled-notice">
                                                    <p className="security-warning">
                                                        <i className="las la-bell-slash"></i>
                                                        Browser notifications are disabled. Enable them to stay updated.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="two-factor-info">
                                            <p><strong>How it works:</strong></p>
                                            <ul>
                                                <li>You&apos;ll receive notifications for new matches and messages</li>
                                                <li>Notifications only appear when you&apos;re not actively viewing the tab</li>
                                                <li>Click on a notification to go directly to the relevant page</li>
                                                <li>You can disable notifications at any time</li>
                                            </ul>
                                            <div className="security-benefits">
                                                <p><strong>Benefits:</strong></p>
                                                <ul>
                                                    <li><i className="las la-check"></i> Never miss an important match</li>
                                                    <li><i className="las la-check"></i> Respond to messages faster</li>
                                                    <li><i className="las la-check"></i> Stay connected even when multitasking</li>
                                                    <li><i className="las la-check"></i> Only notifies when you&apos;re away from the tab</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Deactivation Section */}
                                <div className="settings-section">
                                    <h3>Profile Status</h3>
                                    <div className="account-status-container">
                                        <div className="status-info">
                                            <p>
                                                <strong>Current Status:</strong> {isDeactivated ? 'Profile Off' : 'Profile On'}
                                            </p>
                                            {isDeactivated ? (
                                                <p className="deactivated-notice">
                                                    Your profile is currently turned off. Your profile is hidden from other users.
                                                </p>
                                            ) : (
                                                <p className="active-notice">
                                                    Your profile is on and visible to other users.
                                                </p>
                                            )}
                                        </div>

                                        <div className="form-row">
                                            <button
                                                className={isDeactivated ? "btn-primary" : "btn-danger"}
                                                type="button"
                                                onClick={handleAccountDeactivation}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Processing...' : (isDeactivated ? 'Turn On Profile' : 'Turn Off Profile')}
                                            </button>
                                        </div>

                                        {!isDeactivated && (
                                            <div className="deactivation-warning">
                                                <p><strong>Warning:</strong> Turning off your profile will:</p>
                                                <ul>
                                                    <li>Hide your profile from other users</li>
                                                    <li>Prevent you from appearing in search results</li>
                                                    <li>Disable notifications</li>
                                                    <li>You can turn your profile back on at any time</li>
                                                    <li>If you are a Premium member, you will continue to be charged until you cancel your subscription</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Blocked Users Section */}
                            <div className="settings-section full-width">
                                <h3>Blocked Users</h3>
                                <div className="blocked-users-container">
                                    <div className="blocked-users-info">
                                        <p>Manage users you have blocked. Blocked users cannot see your profile, send you messages, or interact with you.</p>
                                    </div>

                                    {isLoadingBlockedUsers ? (
                                        <div className="loading-message">
                                            <p>Loading blocked users...</p>
                                        </div>
                                    ) : blockedUsers.length === 0 ? (
                                        <div className="no-blocked-users">
                                            <p>You haven&apos;t blocked any users yet.</p>
                                        </div>
                                    ) : (
                                        <div className="blocked-users-list">
                                            {blockedUsers.map((user) => (
                                                <div key={user.id} className="blocked-user-item">
                                                    <div className="blocked-user-info">
                                                        <div className="blocked-user-avatar">
                                                            {user.publicMainPhoto ? (
                                                                <img
                                                                    src={user.publicMainPhoto}
                                                                    alt={user.displayName}
                                                                    className="user-photo"
                                                                />
                                                            ) : (
                                                                <div className="no-photo">
                                                                    <i className="las la-user"></i>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="blocked-user-details">
                                                            <h4>{user.displayName}</h4>
                                                            <p className="blocked-info">
                                                                Blocked {(user as any).blockedAtHumanized || 'recently'}
                                                            </p>
                                                            <p className="user-location">{user.locationName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="blocked-user-actions">
                                                        <button
                                                            className="btn-primary"
                                                            type="button"
                                                            onClick={() => handleUnblockUser(user.id)}
                                                            disabled={unblockingUserId === user.id}
                                                        >
                                                            {unblockingUserId === user.id ? 'Unblocking...' : 'Unblock'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Delete Account Section */}
                            <div className="settings-section danger-section">
                                <h3>Delete Account</h3>
                                <div className="delete-account-container">
                                    <div className="danger-warning">
                                        <p><strong>⚠️ Danger Zone</strong></p>
                                        <p>Once you delete your account, there is no going back. This action is permanent and cannot be undone.</p>
                                    </div>

                                    {/* Delete Form Errors */}
                                    {errors.deleteForm && (
                                        <div className="error-message">
                                            {errors.deleteForm}
                                        </div>
                                    )}

                                    {isSignedInWithGoogle ? (
                                        <>
                                            <div className="form-row">
                                                <button
                                                    className="btn-primary"
                                                    type="button"
                                                    onClick={handleSendDeletionCode}
                                                    disabled={isSendingDeletionCode}
                                                >
                                                    {isSendingDeletionCode ? 'Sending Code...' : (isDeletionCodeSent ? 'Resend Code' : 'Send Verification Code')}
                                                </button>
                                            </div>
                                            <div className="form-row">
                                                <div className={`input-container ${errors.deletionCode ? 'error' : ''}`}>
                                                    <label htmlFor="deletionCode">Enter 6-digit verification code</label>
                                                    <input
                                                        type="text"
                                                        id="deletionCode"
                                                        name="deletionCode"
                                                        value={deletionCode}
                                                        onChange={(e) => setDeletionCode(e.target.value)}
                                                        className={errors.deletionCode ? 'error' : ''}
                                                        placeholder="Enter 6-digit code"
                                                    />
                                                    {errors.deletionCode && (
                                                        <div className="error-message">{errors.deletionCode}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="form-row">
                                            <div className={`input-container ${errors.deletePassword ? 'error' : ''}`}>
                                                <label htmlFor="deletePassword">Enter your password to confirm deletion</label>
                                                <div className="password-input-wrapper">
                                                    <input
                                                        type={showDeletePassword ? "text" : "password"}
                                                        id="deletePassword"
                                                        name="deletePassword"
                                                        value={deletePassword}
                                                        onChange={(e) => setDeletePassword(e.target.value)}
                                                        className={errors.deletePassword ? 'error' : ''}
                                                        placeholder="Enter your password"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle"
                                                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                                                        tabIndex={-1}
                                                    >
                                                        <i className={`las ${showDeletePassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                    </button>
                                                </div>
                                                {errors.deletePassword && (
                                                    <div className="error-message">{errors.deletePassword}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-row">
                                        <button
                                            className="btn-danger"
                                            type="button"
                                            onClick={handleAccountDeletion}
                                            disabled={isDeleting || (isSignedInWithGoogle ? deletionCode.trim().length !== 6 : !deletePassword)}
                                        >
                                            {isDeleting ? 'Deleting Account...' : 'Delete My Account Permanently'}
                                        </button>
                                    </div>

                                    <div className="deletion-warning">
                                        <p><strong>This will permanently delete:</strong></p>
                                        <ul>
                                            <li>Your profile and all personal information</li>
                                            <li>All your photos and uploaded content</li>
                                            <li>Your matches and conversation history</li>
                                            <li>All messages sent and received</li>
                                            <li>Your subscription and billing information</li>
                                            <li>Your payment methods and billing information</li>
                                            <li>Your account preferences and settings</li>
                                        </ul>
                                        <p><strong>Note:</strong> This action cannot be undone. You will need to create a new account if you wish to use the service again.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Deactivation Confirmation Dialog */}
                <ConfirmDialog
                    open={showDeactivateConfirm}
                    title="Turn Off Profile?"
                    message={
                        <div>
                            <p>Are you sure you want to turn off your profile? Your profile will be hidden from other users until you turn it back on.</p>
                            {currentUser?.isPremium && (
                                <p className="premium-billing-notice">
                                    <strong>Note:</strong> You will continue to be billed for your Premium membership until you cancel your subscription in the Billing section.
                                </p>
                            )}
                        </div>
                    }
                    confirmText="Turn Off Profile"
                    cancelText="Cancel"
                    confirmColor="warning"
                    onConfirm={() => performAccountDeactivation(true)}
                    onCancel={() => setShowDeactivateConfirm(false)}
                />
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
