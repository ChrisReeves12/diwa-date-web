'use client';

import { useRouter } from 'next/navigation';
import UserPhotoDisplay from '@/common/user-photo-display/user-photo-display';
import { useCurrentUser } from '@/common/context/current-user-context';
import Link from 'next/link';
import Image from 'next/image';
import { logoutAction } from '@/common/server-actions/logout.actions';
import './user-profile-account-menu.scss';
import { toggleOnlineStatus } from '@/common/server-actions/user.actions';
import { useState } from 'react';
import { isUserOnline } from '@/helpers/user.helpers';
import { showAlert } from '@/util';
import { Switch } from '@mui/material';

interface UserProfileAccountMenuProps {
  onSelectionMade?: () => void;
}

export default function UserProfileAccountMenu({ onSelectionMade }: UserProfileAccountMenuProps) {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(currentUser?.lastActiveAt ? isUserOnline(currentUser.lastActiveAt, currentUser.hideOnlineStatus) : false);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(currentUser?.hideOnlineStatus || false);

  const handleToggleOnlineStatus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent event bubbling to avoid closing the popover
    e.stopPropagation();

    const newHideOnlineStatus = !e.target.checked;
    setHideOnlineStatus(newHideOnlineStatus);
    await toggleOnlineStatus(newHideOnlineStatus);
    setIsOnline(currentUser?.lastActiveAt ? isUserOnline(currentUser.lastActiveAt, newHideOnlineStatus) : false);
  };

  const handleSelectionMade = () => {
    if (onSelectionMade) {
      onSelectionMade();
    }
  };

  const handleSignOut = async () => {
    try {
      const result = await logoutAction();

      if (result.success) {
        window.location.href = '/';
      } else {
        showAlert('An error occurred while signing out.');
        console.error('Logout failed:', result.message);
      }
    } catch (error) {
      showAlert('An error occurred while signing out.');
      console.error('Error during logout:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="user-profile-account-menu-container">
      {currentUser && (
        <div className="profile-photo-name-section">
          <Link href={`/user/${currentUser.id}`} onClick={handleSelectionMade}>
            <UserPhotoDisplay
              gender={currentUser.gender}
              alt={currentUser.displayName}
              croppedImageData={currentUser.mainPhotoCroppedImageData}
              imageUrl={currentUser.publicMainPhoto}
            />
          </Link>
          <div className="name-online-status-section">
            <h5>{currentUser.displayName}</h5>
            <div className="online-status">
              <div className="online-lamp-section">
                <div className={`online-lamp ${!hideOnlineStatus ? 'online' : 'offline'}`}></div>
                <div className="online-status-label">{!hideOnlineStatus ? 'Online' : 'Offline'}</div>
              </div>
              <div className="online-status-selector">
                <Switch
                  checked={!hideOnlineStatus}
                  onChange={handleToggleOnlineStatus}
                  size="small"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="profile-menu-section">
        <Link href="/profile" className="menu-item" onClick={handleSelectionMade}>
          <div className="icon">
            <Image
                width={35}
                height={35}
                style={{ scale: 1.5 }}
                src="/images/user.svg"
                alt="Profile Settings"
            />
          </div>
          <div className="label">Profile Settings</div>
        </Link>
        <Link href="/account/settings" className="menu-item" onClick={handleSelectionMade}>
          <div className="icon">
            <Image
              width={45}
              height={45}
              style={{ scale: 1.3 }}
              src="/images/gear.svg"
              alt="Account Settings"
            />
          </div>
          <div className="label">Account Settings</div>
        </Link>
      </div>
      <div className="sign-out-button-section">
        <button onClick={handleSignOut}>
          <div className="icon">
            <Image
              width={20}
              height={20}
              src="/images/sign-out.svg"
              alt="Sign Out"
            />
          </div>
          <div className="label">Sign Out</div>
        </button>
      </div>
    </div>
  );
}
