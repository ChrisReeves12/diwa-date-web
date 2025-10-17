import TabBar from "@/common/tab-bar/tab-bar";

export function ProfileSettingsTabs({ selectedTab }: {
    selectedTab: 'personal-information' | 'photos'
}) {
    return (
        <TabBar tabs={[
            { label: 'Personal Information', iconString: 'las la-user', isSelected: selectedTab === 'personal-information', url: '/profile/personal-information' },
            { label: 'Photos', iconString: 'las la-camera', isSelected: selectedTab === 'photos', url: '/profile/photos' }
        ]} />
    )
}
