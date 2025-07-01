"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserProfileAccountMenu;
const navigation_1 = require("next/navigation");
const user_photo_display_1 = __importDefault(require("@/common/user-photo-display/user-photo-display"));
const current_user_context_1 = require("@/common/context/current-user-context");
const link_1 = __importDefault(require("next/link"));
const image_1 = __importDefault(require("next/image"));
const logout_actions_1 = require("@/common/server-actions/logout.actions");
require("./user-profile-account-menu.scss");
const user_actions_1 = require("@/common/server-actions/user.actions");
const react_1 = require("react");
const user_helpers_1 = require("@/helpers/user.helpers");
function UserProfileAccountMenu({ onSelectionMade }) {
    const currentUser = (0, current_user_context_1.useCurrentUser)();
    const router = (0, navigation_1.useRouter)();
    const [isOnline, setIsOnline] = (0, react_1.useState)((currentUser === null || currentUser === void 0 ? void 0 : currentUser.lastActiveAt) ? (0, user_helpers_1.isUserOnline)(currentUser.lastActiveAt, currentUser.hideOnlineStatus) : false);
    const [hideOnlineStatus, setHideOnlineStatus] = (0, react_1.useState)((currentUser === null || currentUser === void 0 ? void 0 : currentUser.hideOnlineStatus) || false);
    const handleToggleOnlineStatus = async (e) => {
        // Prevent event bubbling to avoid closing the popover
        e.stopPropagation();
        const newHideOnlineStatus = !hideOnlineStatus;
        setHideOnlineStatus(newHideOnlineStatus);
        await (0, user_actions_1.toggleOnlineStatus)(newHideOnlineStatus);
        setIsOnline((currentUser === null || currentUser === void 0 ? void 0 : currentUser.lastActiveAt) ? (0, user_helpers_1.isUserOnline)(currentUser.lastActiveAt, newHideOnlineStatus) : false);
    };
    const handleSelectionMade = () => {
        if (onSelectionMade) {
            onSelectionMade();
        }
    };
    const handleSignOut = async () => {
        try {
            const result = await (0, logout_actions_1.logoutAction)();
            if (result.success) {
                window.location.href = '/';
            }
            else {
                window.alert('An error occurred while signing out.');
                console.error('Logout failed:', result.message);
            }
        }
        catch (error) {
            window.alert('An error occurred while signing out.');
            console.error('Error during logout:', error);
        }
    };
    if (!currentUser)
        return null;
    return (<div className="user-profile-account-menu-container">
      {currentUser && (<div className="profile-photo-name-section">
          <user_photo_display_1.default gender={currentUser.gender} alt={currentUser.displayName} croppedImageData={currentUser.mainPhotoCroppedImageData} imageUrl={currentUser.publicMainPhoto}/>
          <div className="name-online-status-section">
            <h5>{currentUser.displayName}</h5>
            <button className="online-status" onClick={handleToggleOnlineStatus}>
              <div className="online-lamp-section">
                <div className={`online-lamp ${isOnline ? 'online' : 'offline'}`}></div>
                <div className="online-status-label">{isOnline ? 'Online Now' : 'Offline'}</div>
              </div>
              <div className="online-status-selector">
                <i className="las la-angle-down"></i>
              </div>
            </button>
          </div>
        </div>)}
      <div className="profile-menu-section">
        <link_1.default href="/account/settings" className="menu-item" onClick={handleSelectionMade}>
          <div className="icon">
            <image_1.default width={45} height={45} style={{ scale: 1.3 }} src="/images/gear.svg" alt="Account Settings"/>
          </div>
          <div className="label">Account Settings</div>
        </link_1.default>
        <link_1.default href="/profile" className="menu-item" onClick={handleSelectionMade}>
          <div className="icon">
            <image_1.default width={35} height={35} style={{ scale: 1.5 }} src="/images/user.svg" alt="Profile Settings"/>
          </div>
          <div className="label">Profile Settings</div>
        </link_1.default>
      </div>
      <div className="sign-out-button-section">
        <button onClick={handleSignOut}>
          <div className="icon">
            <image_1.default width={20} height={20} src="/images/sign-out.svg" alt="Sign Out"/>
          </div>
          <div className="label">Sign Out</div>
        </button>
      </div>
    </div>);
}
//# sourceMappingURL=user-profile-account-menu.jsx.map