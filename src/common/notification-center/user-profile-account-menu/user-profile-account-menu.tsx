'use client';

import { useRouter } from 'next/navigation';
import UserPhotoDisplay from '@/common/user-photo-display/user-photo-display';
import { useCurrentUser } from '@/common/context/current-user-context';
import Link from 'next/link';
import Image from 'next/image';
import './user-profile-account-menu.scss';

interface UserProfileAccountMenuProps {
  onSelectionMade?: () => void;
}

export default function UserProfileAccountMenu({ onSelectionMade }: UserProfileAccountMenuProps) {
  const currentUser = useCurrentUser();
  const router = useRouter();

  const handleSelectionMade = () => {
    if (onSelectionMade) {
      onSelectionMade();
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/user/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Redirect to home page after successful logout
        window.location.href = '/';
      } else {
        // Handle error
        window.alert('An error occurred while signing out.');
        console.error('Logout failed');
      }
    } catch (error) {
      window.alert('An error occurred while signing out.');
      console.error('Error during logout:', error);
    }
  };

  // We don't need to handle the main photo logic here as UserPhotoDisplay handles it

  if (!currentUser) return null;

  return (
    <div className="user-profile-account-menu-container">
      {currentUser && (
        <div className="profile-photo-name-section">
          <Link href={`/profile/${currentUser.id}`} onClick={handleSelectionMade}>
            <UserPhotoDisplay
              gender={currentUser.gender}
              alt={currentUser.display_name}
              croppedImageData={currentUser.main_photo_cropped_image_data}
              imageUrl={currentUser.public_main_photo}
            />
          </Link>
          <div className="name-online-status-section">
            <h5>{currentUser.display_name}</h5>
            <button className="online-status">
              <div className="online-lamp-section">
                <div className="online-lamp online"></div>
                <div className="online-status-label">Online Now</div>
              </div>
              <div className="online-status-selector">
                <i className="las la-angle-down"></i>
              </div>
            </button>
          </div>
        </div>
      )}
      <div className="profile-menu-section">
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
        <Link href="/profile/settings" className="menu-item" onClick={handleSelectionMade}>
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
