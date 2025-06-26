'use client';

import { User, UserPhoto } from "@/types";
import { CroppedImageData } from "@/types/cropped-image-data.interface";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { AccountSettingsTabs } from "@/app/account/account-settings-tabs";
import React, { useState } from "react";

interface AccountSettingsProps {
    currentUser?: User & {
        isSubscriptionActive: boolean;
        mainPhotoCroppedImageData?: CroppedImageData;
        publicMainPhoto?: string;
        publicPhotos: UserPhoto[]
    }
}

export function UserSettings({ currentUser }: AccountSettingsProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (formData: FormData)=> {

    }

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="account-settings-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <h2>Account | User Settings</h2>
                        <AccountSettingsTabs selectedTab={'user-settings'}/>
                        <div className="account-settings-form-container user-settings">
                            <form action={handleSubmit}>
                                <div className="form-row">
                                    <div className="input-container">
                                        {/* Input field here */}
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
