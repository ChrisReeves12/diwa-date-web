'use client';

import './dashboard-wrapper.scss';
import { User } from "../../types";
import UserSubscriptionPlanDisplay from "@/common/user-subscription-plan-display/user-subscription-plan-display";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteWrapper from "@/common/site-wrapper/site-wrapper";
import TabBar from "@/common/tab-bar/tab-bar";
import { useEffect } from "react";
import { loadGoogleMapsScript } from "@/util";
import { FaComments } from "react-icons/fa6";

interface DashboardWrapperProps {
    currentUser: User,
    activeTab: 'search' | 'likes' | 'messages',
    children: React.ReactNode
}

export default function DashboardWrapper({ currentUser, activeTab, children }: DashboardWrapperProps) {
    const tabs = [
        { label: 'Search', url: '/', iconString: 'las la-search', isSelected: activeTab === 'search' },
        { label: 'Likes', url: '/likes', iconString: 'las la-heart', isSelected: activeTab === 'likes' },
        { label: 'Messages', url: '/messages', icon: <FaComments size={23} />, isSelected: activeTab === 'messages' },
    ];

    useEffect(() => {
        loadGoogleMapsScript();
    }, []);

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteWrapper>
                <div className="dashboard-wrapper-container">
                    <div className="container">
                        <UserSubscriptionPlanDisplay />
                        <div className="dashboard-content-section">
                            <TabBar tabs={tabs} />
                            {children}
                        </div>
                    </div>
                </div>
            </SiteWrapper>
        </CurrentUserProvider>
    );
}
