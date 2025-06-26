import { User, UserPhoto } from "@/types";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { AccountSettingsTabs } from "@/app/account/account-settings-tabs";

interface AccountSettingsProps {
    currentUser?: User & {
        isSubscriptionActive: boolean;
        mainPhotoCroppedImageData?: CroppedImageData;
        publicMainPhoto?: string;
        publicPhotos: UserPhoto[]
    }
}

export function BillingInformation({ currentUser }: AccountSettingsProps) {
    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="account-settings-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <h2>Account | Billing Information</h2>
                        <AccountSettingsTabs selectedTab={'billing'}/>
                        <div className="account-settings-form-container billing-settings">
                            <form>
                                {/* Form inputs */}
                            </form>
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
