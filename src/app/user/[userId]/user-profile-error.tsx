import { ReactNode } from "react";
import SiteTopBar from "@/common/site-top-bar/site-top-bar";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import { User } from "@/types";
interface UserProfileErrorProps {
    children: ReactNode,
    currentUser?: User
}

export default function UserProfileError({ children, currentUser }: UserProfileErrorProps) {
    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteTopBar />
            <div className="error-notification-section">
                {children}
            </div>
        </CurrentUserProvider>
    );
}
