import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { ProfileSettingsTabs } from "../profile-settings-tabs";
import { PhotosManagement } from "./photos-management";
import '../profile-settings.scss';

export const metadata = {
    title: `${process.env.APP_NAME} | Profile - Photos`,
};

export default async function PhotosPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/profile/photos');
    }

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="profile-settings-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <h2>Photo Management</h2>
                        <ProfileSettingsTabs selectedTab="photos" />
                        <PhotosManagement />
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
