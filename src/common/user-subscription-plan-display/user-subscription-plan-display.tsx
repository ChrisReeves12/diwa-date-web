'use client';

import './user-subscription-plan-display.scss';
import { useCurrentUser } from "@/common/context/current-user-context";

export default function UserSubscriptionPlanDisplay() {
    const currentUser = useCurrentUser();
    if (!currentUser) {
        return null;
    }

    return (
        <div className="subscription-plan-display-container">
            <div className="label">My Subscription Level:</div>
            <div className="subscription-level">{currentUser.isSubscriptionActive ? 'Premium' : 'Free'} Member</div>
        </div>
    );
}
