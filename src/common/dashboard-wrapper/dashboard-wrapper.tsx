'use client';

import './dashboard-wrapper.scss';
import { User } from "../../types";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import TabBar from "@/common/tab-bar/tab-bar";

interface DashboardWrapperProps {
    currentUser: User,
    activeTab: 'search'|'likes'|'messages',
    children: React.ReactNode
}

export default function DashboardWrapper({ currentUser, activeTab, children }: DashboardWrapperProps) {
    const tabs = [
        {label: 'Search', url: '/', icon: 'las la-search', isSelected: activeTab === 'search' },
        {label: 'Likes', url: '/likes', icon: 'las la-heart', isSelected: activeTab === 'likes' },
        {label: 'Messages', url: '/messages', icon: 'las la-comments', isSelected: activeTab === 'messages' },
    ];

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="dashboard-wrapper-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <div className="search-new-members-section">
                            <div className="left-section">
                                <TabBar tabs={tabs}/>
                                {children}
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
