"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileSettingsTabs = ProfileSettingsTabs;
const tab_bar_1 = __importDefault(require("@/common/tab-bar/tab-bar"));
function ProfileSettingsTabs({ selectedTab }) {
    return (<tab_bar_1.default tabs={[
            { label: 'Personal Information', icon: 'las la-user', isSelected: selectedTab === 'personal-information', url: '/profile/personal-information' },
            { label: 'Photos', icon: 'las la-camera', isSelected: selectedTab === 'photos', url: '/profile/photos' }
        ]}/>);
}
//# sourceMappingURL=profile-settings-tabs.jsx.map