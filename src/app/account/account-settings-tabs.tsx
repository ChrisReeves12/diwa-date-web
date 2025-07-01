import TabBar from "@/common/tab-bar/tab-bar";

export function AccountSettingsTabs({ selectedTab }: {
        selectedTab: 'user-settings' | 'billing'
    }) {
    return (
        <TabBar tabs={[
            {label: 'General Settings', icon: 'las la-cog', isSelected: selectedTab === 'user-settings', url: '/account/settings'},
            {label: 'Billing Information', icon: 'las la-credit-card', isSelected: selectedTab === 'billing', url: '/account/billing'}
        ]}/>
    )
}
