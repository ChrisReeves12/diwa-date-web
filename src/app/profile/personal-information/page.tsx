import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { ProfileSettingsTabs } from "../profile-settings-tabs";
import { PersonalInformationForm } from "./personal-information-form";
import '../profile-settings.scss';

export const metadata = {
    title: `${process.env.APP_NAME} | Profile - Personal Information`,
};

export default async function PersonalInformationPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/profile/personal-information');
    }

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="profile-settings-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <h2 className="personal-information-title">Personal Information</h2>
                        <ProfileSettingsTabs selectedTab="personal-information" />
                        <PersonalInformationForm currentUser={currentUser} />
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
