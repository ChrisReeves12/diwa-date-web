import { User, UserPhoto } from "@/types";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { ProfileSettingsTabs } from "./profile-settings-tabs";
import { redirect } from "next/navigation";

interface ProfileSettingsProps {
    currentUser?: User
}

export function ProfileSettings({ currentUser }: ProfileSettingsProps) {
    // Redirect to personal information tab by default
    redirect('/profile/personal-information');
    return null;
}
