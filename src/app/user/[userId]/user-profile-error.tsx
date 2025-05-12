import { ReactNode } from "react";
import SiteTopBar from "@/common/site-top-bar/site-top-bar";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import { User } from "@/types";
import { NotificationResponse } from "@/types/notification-response.interface";

interface UserProfileErrorProps {
    children: ReactNode,
    currentUser?: User,
    notificationsPromise?: Promise<NotificationResponse>
}

export default function UserProfileError({ children, currentUser, notificationsPromise }: UserProfileErrorProps) {
    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteTopBar notificationsPromise={notificationsPromise} />
            <div className="error-notification-section">
                { children }
            </div>
        </CurrentUserProvider>
    );
}
