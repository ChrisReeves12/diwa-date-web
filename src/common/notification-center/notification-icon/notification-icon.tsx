import './notification-icon.scss';
import Image from 'next/image';

interface NotificationIconProps {
    lightIcon: string;
    darkIcon: string;
    title: string;
    alt: string;
    onClick?: (e: React.MouseEvent<HTMLElement>) => void;
    count?: number;
    disabled?: boolean;
    errorMessage?: string;
    hasNewNotification?: boolean;
}

export default function NotificationIcon({
    lightIcon,
    darkIcon,
    title,
    alt,
    onClick,
    count,
    disabled = false,
    errorMessage,
    hasNewNotification = false
}: NotificationIconProps) {
    return (
        <div className="notification-icon-container">
            <button
                onClick={onClick}
                disabled={disabled}
                title={errorMessage || title}
            >
                <span className="light-dark">
                    <span className="light">
                        <Image width={45} height={45} title={title} alt={alt} src={lightIcon} />
                    </span>
                    <span className="dark">
                        <Image width={45} height={45} title={title} alt={alt} src={darkIcon} />
                    </span>
                </span>
                {!!count && count > 0 && (
                    <div className={`notification-count-bubble ${hasNewNotification ? 'new-notification' : ''}`}>
                        {count > 99 ? '99+' : count}
                    </div>
                )}
            </button>
        </div>
    );
} 