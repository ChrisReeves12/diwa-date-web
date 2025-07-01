"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileSettings = ProfileSettings;
const navigation_1 = require("next/navigation");
function ProfileSettings({ currentUser }) {
    // Redirect to personal information tab by default
    (0, navigation_1.redirect)('/profile/personal-information');
    return null;
}
//# sourceMappingURL=profile-settings.jsx.map