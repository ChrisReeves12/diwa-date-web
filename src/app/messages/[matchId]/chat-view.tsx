'use client';

import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import { User } from "@/types";

export default function ChatView({ currentUser }: { currentUser: User }) {
    return (
        <DashboardWrapper activeTab="messages" currentUser={currentUser}>
            <div>Messages list</div>
        </DashboardWrapper>
    );
}