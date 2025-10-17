import TabBar from "@/common/tab-bar/tab-bar";
import { MdWorkspacePremium } from "react-icons/md";

export function AccountSettingsTabs({ selectedTab }: {
    selectedTab: 'user-settings' | 'billing'
}) {
    return (
        <TabBar tabs={[
            { label: 'General Settings', iconString: 'las la-cog', isSelected: selectedTab === 'user-settings', url: '/account/settings' },
            { label: 'Premium Membership', icon: <MdWorkspacePremium size={23} />, isSelected: selectedTab === 'billing', url: '/account/billing' }
        ]} />
    )
}
