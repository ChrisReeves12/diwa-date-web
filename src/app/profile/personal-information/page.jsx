"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PersonalInformationPage;
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const headers_1 = require("next/headers");
const navigation_1 = require("next/navigation");
const site_wrapper_1 = __importDefault(require("@/common/site-wrapper/site-wrapper"));
const current_user_context_1 = require("@/common/context/current-user-context");
const user_subscription_plan_display_1 = __importDefault(require("@/common/user-subscription-plan-display/user-subscription-plan-display"));
const profile_settings_tabs_1 = require("../profile-settings-tabs");
const personal_information_form_1 = require("./personal-information-form");
require("../profile-settings.scss");
async function PersonalInformationPage() {
    const currentUser = await (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
    if (!currentUser) {
        (0, navigation_1.redirect)('/login');
    }
    return (<current_user_context_1.CurrentUserProvider currentUser={currentUser}>
            <site_wrapper_1.default>
                <div className="profile-settings-container">
                    <div className="container">
                        <user_subscription_plan_display_1.default />
                        <h2>Profile | Personal Information</h2>
                        <profile_settings_tabs_1.ProfileSettingsTabs selectedTab="personal-information"/>
                        <personal_information_form_1.PersonalInformationForm currentUser={currentUser}/>
                    </div>
                </div>
            </site_wrapper_1.default>
        </current_user_context_1.CurrentUserProvider>);
}
//# sourceMappingURL=page.jsx.map