'use client';

import { User } from "../../types";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";

export default function SearchHome({ currentUser }: { currentUser: User }) {
    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="search-home-wrapper">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                    </div>
                    <div className="container">
                        <div className="search-new-members-section">
                            <div className="left-section">

                            </div>
                            <div className="right-section">

                            </div>
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
