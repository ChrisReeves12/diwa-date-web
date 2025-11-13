'use client';

import './user-subscription-plan-display.scss';
import { useCurrentUser } from "@/common/context/current-user-context";
import Link from "next/link";

export default function UserSubscriptionPlanDisplay() {
    const currentUser = useCurrentUser();
    if (!currentUser) {
        return null;
    }

    return (
        <div className="subscription-plan-display-container">
            <div className="label">My Subscription Level:</div>
            <div className="subscription-level">
                {currentUser.isPremium ? 'Premium' : 'Free'} Member{!currentUser.isPremium ? <Link className="upgrade-link" href={'/upgrade'}>Upgrade</Link> : null}
            </div>
        </div>
    );
}
