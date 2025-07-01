"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = ProfileSettingsPage;
require("./profile-settings.scss");
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const headers_1 = require("next/headers");
const navigation_1 = require("next/navigation");
const profile_settings_1 = require("@/app/profile/profile-settings");
async function generateMetadata() {
    return {
        title: `${process.env.APP_NAME} | Profile Settings`
    };
}
async function ProfileSettingsPage() {
    const currentUser = await (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
    if (!currentUser) {
        (0, navigation_1.redirect)('/');
    }
    return (<profile_settings_1.ProfileSettings currentUser={currentUser}/>);
}
//# sourceMappingURL=page.jsx.map