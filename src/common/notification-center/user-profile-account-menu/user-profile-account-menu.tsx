'use client';

import UserPhotoDisplay from '@/common/user-photo-display/user-photo-display';
import { useCurrentUser } from '@/common/context/current-user-context';
import Link from 'next/link';
import Image from 'next/image';
import { logoutAction } from '@/common/server-actions/logout.actions';
import './user-profile-account-menu.scss';
import { toggleOnlineStatus } from '@/common/server-actions/user.actions';
import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentUserPhotoAndOnlineVisibility } from '@/common/server-actions/user-profile.actions';
import { isUserOnline } from '@/helpers/user.helpers';
import { showAlert } from '@/util';
import { Switch } from '@mui/material';
import { User } from '@/types';
import { BiSolidHide } from "react-icons/bi";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import { TimesIcon } from "react-line-awesome";

interface UserProfileAccountMenuProps {
  onSelectionMade?: () => void;
  currentUser?: User;
  onClose?: () => void;
}

export default function UserProfileAccountMenu({ onSelectionMade, currentUser, onClose }: UserProfileAccountMenuProps) {
  const lCurrentUser = currentUser || useCurrentUser();
  const [hideOnlineStatus, setHideOnlineStatus] = useState(lCurrentUser?.hideOnlineStatus || false);
  const [userMainPhoto, setUserMainPhoto] = useState<string | undefined>(lCurrentUser?.publicMainPhoto);
  const [userMainPhotoCroppedImageData, setUserMainPhotoCroppedImageData] = useState<any>(lCurrentUser?.mainPhotoCroppedImageData);
  const [isDeactivated, setIsDeactivated] = useState<boolean>(!!lCurrentUser?.deactivatedAt);

  // Refetch user main photo and profile visibility status data from server
  const refetchUserMainPhotoAndOnlineVisibility = useCallback(async () => {
    if (!lCurrentUser) return;

    try {
      const partialUserData = await fetchCurrentUserPhotoAndOnlineVisibility();
      if (partialUserData) {
        setUserMainPhoto(partialUserData.publicMainPhoto);
        setUserMainPhotoCroppedImageData(partialUserData.mainPhotoCroppedImageData);
        setHideOnlineStatus(partialUserData.hideOnlineStatus);
        setIsDeactivated(!!partialUserData.deactivatedAt);
      }
    } catch (err) {
      console.error('Error refetching user partial data:', err);
    }
  }, [lCurrentUser]);

  // Initialize user photo and online visibility state when the currentUser changes
  useEffect(() => {
    if (lCurrentUser) {
      setUserMainPhoto(lCurrentUser.publicMainPhoto);
      setUserMainPhotoCroppedImageData(lCurrentUser.mainPhotoCroppedImageData);
      setHideOnlineStatus(lCurrentUser.hideOnlineStatus);
    }
  }, [lCurrentUser]);

  useEffect(() => {
    refetchUserMainPhotoAndOnlineVisibility();
  }, []);

  // Listen for photo update events
  useEffect(() => {
    const handlePhotoRefresh = () => {
      refetchUserMainPhotoAndOnlineVisibility();
    };

    window.addEventListener('refresh-user-profile-main-photo', handlePhotoRefresh);

    return () => {
      window.removeEventListener('refresh-user-profile-main-photo', handlePhotoRefresh);
    };
  }, [refetchUserMainPhotoAndOnlineVisibility]);

  const handleToggleOnlineStatus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();

    const newHideOnlineStatus = !e.target.checked;
    setHideOnlineStatus(newHideOnlineStatus);
    await toggleOnlineStatus(newHideOnlineStatus);
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

  if (!lCurrentUser) return null;

  return (
    <div className="user-profile-account-menu-container">
      {onClose && (
        <button className="close-button" onClick={onClose} aria-label="Close">
          <TimesIcon />
        </button>
      )}
      {lCurrentUser && (
        <div className="profile-photo-name-section">
          <Link href={`/user/${lCurrentUser.id}`} onClick={handleSelectionMade}>
            <UserPhotoDisplay
              gender={lCurrentUser.gender}
              alt={lCurrentUser.displayName}
              croppedImageData={userMainPhotoCroppedImageData}
              imageUrl={userMainPhoto}
            />
          </Link>
          <div className="name-online-status-section">
            <h5>{lCurrentUser.displayName}</h5>
            {isDeactivated && <div className='deactivated-notice'>
              <BiSolidHide className='icon' />
              <div className='label'>Your profile is hidden. <Link href='/account/settings'>Turn On <FaArrowUpRightFromSquare /></Link></div>
            </div>}
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
              alt="Edit Profile"
            />
          </div>
          <div className="label">Edit Profile</div>
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
        <Link href="/support" className="menu-item" onClick={handleSelectionMade}>
          <div className="icon">
            <Image
              width={45}
              height={45}
              style={{ scale: 1.3 }}
              src="/images/help.svg"
              alt="Help Center"
            />
          </div>
          <div className="label">Support Center</div>
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
