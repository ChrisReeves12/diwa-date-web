"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneralSettings = GeneralSettings;
const current_user_context_1 = require("@/common/context/current-user-context");
const site_wrapper_1 = __importDefault(require("@/common/site-wrapper/site-wrapper"));
const user_subscription_plan_display_1 = __importDefault(require("@/common/user-subscription-plan-display/user-subscription-plan-display"));
const account_settings_tabs_1 = require("@/app/account/account-settings-tabs");
const user_actions_1 = require("@/common/server-actions/user.actions");
const react_1 = __importStar(require("react"));
function GeneralSettings({ currentUser }) {
    const [errors, setErrors] = (0, react_1.useState)({});
    const [successMessage, setSuccessMessage] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    // Password form state
    const [currentPassword, setCurrentPassword] = (0, react_1.useState)('');
    const [newPassword, setNewPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
    const [showCurrentPassword, setShowCurrentPassword] = (0, react_1.useState)(false);
    const [showNewPassword, setShowNewPassword] = (0, react_1.useState)(false);
    const [showConfirmPassword, setShowConfirmPassword] = (0, react_1.useState)(false);
    // Account deactivation state
    const [isDeactivated, setIsDeactivated] = (0, react_1.useState)(!!(currentUser === null || currentUser === void 0 ? void 0 : currentUser.deactivatedAt));
    // Delete account state
    const [deletePassword, setDeletePassword] = (0, react_1.useState)('');
    const [showDeletePassword, setShowDeletePassword] = (0, react_1.useState)(false);
    const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
    // Blocked users state
    const [blockedUsers, setBlockedUsers] = (0, react_1.useState)([]);
    const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = (0, react_1.useState)(true);
    const [unblockingUserId, setUnblockingUserId] = (0, react_1.useState)(null);
    // Load blocked users on component mount
    (0, react_1.useEffect)(() => {
        const loadBlockedUsers = async () => {
            try {
                const users = await (0, user_actions_1.getBlockedUsersList)();
                setBlockedUsers(users);
            }
            catch (error) {
                console.error('Failed to load blocked users:', error);
            }
            finally {
                setIsLoadingBlockedUsers(false);
            }
        };
        loadBlockedUsers();
    }, []);
    const handleUnblockUser = async (userId) => {
        setUnblockingUserId(userId);
        setErrors({});
        setSuccessMessage('');
        try {
            const result = await (0, user_actions_1.unblockUser)(userId);
            if (!result.success) {
                setErrors({ form: result.error || 'Failed to unblock user' });
                return;
            }
            // Remove the user from the blocked users list
            setBlockedUsers(prev => prev.filter(user => user.id !== userId));
            setSuccessMessage('User unblocked successfully');
        }
        catch (error) {
            console.error('Unblock user error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        }
        finally {
            setUnblockingUserId(null);
        }
    };
    const handlePasswordSubmit = async (formData) => {
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
            const result = await (0, user_actions_1.updatePassword)(currentPassword, newPassword);
            if (!result.success) {
                setErrors({ form: result.error || 'Failed to update password' });
                return;
            }
            // Success
            setSuccessMessage('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
        catch (error) {
            console.error('Password update error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleAccountDeactivation = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsLoading(true);
        try {
            const shouldDeactivate = !isDeactivated;
            if (shouldDeactivate) {
                const confirmed = window.confirm('Are you sure you want to turn off your profile? Your profile will be hidden from other users until you turn it back on.');
                if (!confirmed) {
                    setIsLoading(false);
                    return;
                }
            }
            const result = await (0, user_actions_1.toggleAccountDeactivation)(shouldDeactivate);
            if (!result.success) {
                setErrors({ form: result.error || 'Failed to update account status' });
                return;
            }
            setIsDeactivated(shouldDeactivate);
            setSuccessMessage(shouldDeactivate
                ? 'Profile turned off successfully'
                : 'Profile turned on successfully');
        }
        catch (error) {
            console.error('Account deactivation error:', error);
            setErrors({ form: 'An unexpected error occurred' });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleAccountDeletion = async () => {
        setErrors({});
        setSuccessMessage('');
        setIsDeleting(true);
        try {
            // Client-side validation
            if (!deletePassword) {
                setErrors({ deletePassword: 'Password is required to delete your account' });
                return;
            }
            // Double confirmation
            const firstConfirm = window.confirm('Are you absolutely sure you want to permanently delete your account? This action cannot be undone.');
            if (!firstConfirm) {
                setIsDeleting(false);
                return;
            }
            const secondConfirm = window.confirm('This will permanently delete:\n\n' +
                '• Your profile and all personal information\n' +
                '• All your photos and messages\n' +
                '• Your matches and conversation history\n' +
                '• Your subscription and billing information\n\n' +
                'Are you sure you want to continue?');
            if (!secondConfirm) {
                setIsDeleting(false);
                return;
            }
            // Call server action
            const result = await (0, user_actions_1.deleteAccount)(deletePassword);
            if (!result.success) {
                setErrors({ deleteForm: result.error || 'Failed to delete account' });
                return;
            }
            // If we reach here, the account was successfully deleted
            window.location.reload();
        }
        catch (error) {
            console.error('Account deletion error:', error);
            setErrors({ deleteForm: 'An unexpected error occurred' });
        }
        finally {
            setIsDeleting(false);
        }
    };
    return (<current_user_context_1.CurrentUserProvider currentUser={currentUser}>
            <site_wrapper_1.default>
                <div className="account-settings-container">
                    <div className="container">
                        <user_subscription_plan_display_1.default />
                        <h2>Account | General Settings</h2>
                        <account_settings_tabs_1.AccountSettingsTabs selectedTab={'user-settings'}/>
                        <div className="account-settings-form-container security-settings">

                            {/* Success Message */}
                            {successMessage && (<div className="success-message">
                                    {successMessage}
                                </div>)}

                            {/* General Form Errors */}
                            {errors.form && (<div className="error-message">
                                    {errors.form}
                                </div>)}

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
                                                    <input type={showCurrentPassword ? "text" : "password"} id="currentPassword" name="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={errors.currentPassword ? 'error' : ''} required/>
                                                    <button type="button" className="password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)} tabIndex={-1}>
                                                        <i className={`las ${showCurrentPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                    </button>
                                                </div>
                                                {errors.currentPassword && (<div className="error-message">{errors.currentPassword}</div>)}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className={`input-container ${errors.newPassword ? 'error' : ''}`}>
                                                <label htmlFor="newPassword">New Password</label>
                                                <div className="password-input-wrapper">
                                                    <input type={showNewPassword ? "text" : "password"} id="newPassword" name="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={errors.newPassword ? 'error' : ''} required/>
                                                    <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)} tabIndex={-1}>
                                                        <i className={`las ${showNewPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                    </button>
                                                </div>
                                                {errors.newPassword && (<div className="error-message">{errors.newPassword}</div>)}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className={`input-container ${errors.confirmPassword ? 'error' : ''}`}>
                                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                                <div className="password-input-wrapper">
                                                    <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={errors.confirmPassword ? 'error' : ''} required/>
                                                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                                                        <i className={`las ${showConfirmPassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                    </button>
                                                </div>
                                                {errors.confirmPassword && (<div className="error-message">{errors.confirmPassword}</div>)}
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <button className="btn-primary" type="submit" disabled={isLoading}>
                                                {isLoading ? 'Updating...' : 'Update Password'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Account Deactivation Section */}
                                <div className="settings-section">
                                    <h3>Profile Status</h3>
                                    <div className="account-status-container">
                                        <div className="status-info">
                            <p>
                                <strong>Current Status:</strong> {isDeactivated ? 'Profile Off' : 'Profile On'}
                            </p>
                            {isDeactivated ? (<p className="deactivated-notice">
                                    Your profile is currently turned off. Your profile is hidden from other users.
                                </p>) : (<p className="active-notice">
                                    Your profile is on and visible to other users.
                                </p>)}
                                        </div>

                                        <div className="form-row">
                                            <button className={isDeactivated ? "btn-primary" : "btn-danger"} type="button" onClick={handleAccountDeactivation} disabled={isLoading}>
                                                {isLoading ? 'Processing...' : (isDeactivated ? 'Turn On Profile' : 'Turn Off Profile')}
                                            </button>
                                        </div>

                                        {!isDeactivated && (<div className="deactivation-warning">
                                                <p><strong>Warning:</strong> Turning off your profile will:</p>
                                                <ul>
                                                    <li>Hide your profile from other users</li>
                                                    <li>Prevent you from appearing in search results</li>
                                                    <li>Disable notifications</li>
                                                    <li>You can turn your profile back on at any time</li>
                                                </ul>
                                            </div>)}
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

                                    {isLoadingBlockedUsers ? (<div className="loading-message">
                                            <p>Loading blocked users...</p>
                                        </div>) : blockedUsers.length === 0 ? (<div className="no-blocked-users">
                                            <p>You haven&apos;t blocked any users yet.</p>
                                        </div>) : (<div className="blocked-users-list">
                                            {blockedUsers.map((user) => (<div key={user.id} className="blocked-user-item">
                                                    <div className="blocked-user-info">
                                                        <div className="blocked-user-avatar">
                                                            {user.publicMainPhoto ? (<img src={user.publicMainPhoto} alt={user.displayName} className="user-photo"/>) : (<div className="no-photo">
                                                                    <i className="las la-user"></i>
                                                                </div>)}
                                                        </div>
                                                        <div className="blocked-user-details">
                                                            <h4>{user.displayName}</h4>
                                                            <p className="blocked-info">
                                                                Blocked {user.blockedAtHumanized || 'recently'}
                                                            </p>
                                                            <p className="user-location">{user.locationName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="blocked-user-actions">
                                                        <button className="btn-primary" type="button" onClick={() => handleUnblockUser(user.id)} disabled={unblockingUserId === user.id}>
                                                            {unblockingUserId === user.id ? 'Unblocking...' : 'Unblock'}
                                                        </button>
                                                    </div>
                                                </div>))}
                                        </div>)}
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
                                    {errors.deleteForm && (<div className="error-message">
                                            {errors.deleteForm}
                                        </div>)}

                                    <div className="form-row">
                                        <div className={`input-container ${errors.deletePassword ? 'error' : ''}`}>
                                            <label htmlFor="deletePassword">Enter your password to confirm deletion</label>
                                            <div className="password-input-wrapper">
                                                <input type={showDeletePassword ? "text" : "password"} id="deletePassword" name="deletePassword" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className={errors.deletePassword ? 'error' : ''} placeholder="Enter your password"/>
                                                <button type="button" className="password-toggle" onClick={() => setShowDeletePassword(!showDeletePassword)} tabIndex={-1}>
                                                    <i className={`las ${showDeletePassword ? 'la-eye-slash' : 'la-eye'}`}></i>
                                                </button>
                                            </div>
                                            {errors.deletePassword && (<div className="error-message">{errors.deletePassword}</div>)}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <button className="btn-danger" type="button" onClick={handleAccountDeletion} disabled={isDeleting || !deletePassword}>
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
                                            <li>Your account preferences and settings</li>
                                        </ul>
                                        <p><strong>Note:</strong> This action cannot be undone. You will need to create a new account if you wish to use the service again.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </site_wrapper_1.default>
        </current_user_context_1.CurrentUserProvider>);
}
//# sourceMappingURL=general-settings.jsx.map