import TabBar from "@/common/tab-bar/tab-bar";

export function AccountSettingsTabs({ selectedTab }: {
        selectedTab: 'user-settings' | 'security' | 'billing'
    }) {
    return (
        <TabBar tabs={[
            {label: 'User Settings', icon: 'las la-cog', isSelected: selectedTab === 'user-settings', url: '/account/settings'},
            {label: 'Privacy & Security Settings', icon: 'las la-lock', isSelected: selectedTab === 'security', url: '/account/security'},
            {label: 'Billing Information', icon: 'las la-credit-card', isSelected: selectedTab === 'billing', url: '/account/billing'}
        ]}/>
    )
}
