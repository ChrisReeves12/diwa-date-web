import { ReactNode } from 'react';
import SiteTopBar from '../site-top-bar/site-top-bar';
import './site-wrapper.scss';
import { NotificationResponse } from '@/types/notification-response.interface';

export default function SiteWrapper({ children, notificationsPromise }: { children: ReactNode, notificationsPromise?: Promise<NotificationResponse> }) {
    return (
        <div className="site-wrapper">
            <SiteTopBar notificationsPromise={notificationsPromise} />
            {children}
        </div>
    );
}
