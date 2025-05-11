'use client';

import './dashboard-wrapper.scss';
import { User } from "../../types";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import TabBar from "@/common/tab-bar/tab-bar";
import { useEffect } from "react";
import { loadGoogleMapsScript } from "@/util";

interface DashboardWrapperProps {
    currentUser: User,
    activeTab: 'search'|'likes'|'messages',
    children: React.ReactNode,
    notificationsPromise?: Promise<any>
}

export default function DashboardWrapper({ currentUser, activeTab, children, notificationsPromise }: DashboardWrapperProps) {
    const tabs = [
        {label: 'Search', url: '/', icon: 'las la-search', isSelected: activeTab === 'search' },
        {label: 'Likes', url: '/likes', icon: 'las la-heart', isSelected: activeTab === 'likes' },
        {label: 'Messages', url: '/messages', icon: 'las la-comments', isSelected: activeTab === 'messages' },
    ];

    useEffect(() => {
        loadGoogleMapsScript();
    }, []);

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper notificationsPromise={notificationsPromise}>
                <div className="dashboard-wrapper-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <div className="dashboard-content-section">
                            <TabBar tabs={tabs}/>
                            {children}
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
