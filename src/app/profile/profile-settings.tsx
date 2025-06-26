import { User, UserPhoto } from "@/types";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";

interface ProfileSettingsProps {
    currentUser?: User & {
        isSubscriptionActive: boolean;
        mainPhotoCroppedImageData?: CroppedImageData;
        publicMainPhoto?: string;
        publicPhotos: UserPhoto[]
    }
}

export function ProfileSettings({ currentUser }: ProfileSettingsProps) {
    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="profile-settings-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <h2>Profile Settings</h2>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
