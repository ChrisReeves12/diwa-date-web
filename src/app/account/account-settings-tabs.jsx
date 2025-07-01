"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountSettingsTabs = AccountSettingsTabs;
const tab_bar_1 = __importDefault(require("@/common/tab-bar/tab-bar"));
function AccountSettingsTabs({ selectedTab }) {
    return (<tab_bar_1.default tabs={[
            { label: 'General Settings', icon: 'las la-cog', isSelected: selectedTab === 'user-settings', url: '/account/settings' },
            { label: 'Billing Information', icon: 'las la-credit-card', isSelected: selectedTab === 'billing', url: '/account/billing' }
        ]}/>);
}
//# sourceMappingURL=account-settings-tabs.jsx.map