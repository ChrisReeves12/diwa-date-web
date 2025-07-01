"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = UserProfilePage;
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const navigation_1 = require("next/navigation");
const user_profile_1 = __importDefault(require("./user-profile"));
const headers_1 = require("next/headers");
require("./user-profile.scss");
const react_1 = require("react");
// Cache the user data to avoid duplicate fetching
const getUser = (0, react_1.cache)(async () => {
    return (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
});
// Cache the user profile data to avoid duplicate fetching
const getUserProfile = (0, react_1.cache)(async (userId) => {
    const currentUser = await getUser();
    if (!currentUser) {
        // Return a more specific type for error cases
        return { statusCode: 401, error: "Not authenticated", userProfileDetails: undefined };
    }
    // Ensure getFullUserProfile also returns a consistent shape, especially for errors
    const profileResult = await (0, user_helpers_1.getFullUserProfile)(Number(userId), Number(currentUser.id));
    if ("error" in profileResult && profileResult.error) {
        return Object.assign(Object.assign({}, profileResult), { userProfileDetails: undefined });
    }
    return profileResult;
});
async function generateMetadata({ params }) {
    var _a;
    const currentUser = await getUser();
    if (!currentUser) {
        return {
            title: process.env.APP_NAME
        };
    }
    else {
        (0, user_helpers_1.refreshLastActive)(currentUser).then();
    }
    const { userId } = await params;
    const userProfileResult = await getUserProfile(userId);
    // Check for error before accessing userProfileDetails
    if (!("userProfileDetails" in userProfileResult) || ("error" in userProfileResult && userProfileResult.error) ||
        ("userProfileDetails" in userProfileResult && !userProfileResult.userProfileDetails)) {
        return {
            title: `${process.env.APP_NAME} | Profile`
        };
    }
    return {
        title: `${process.env.APP_NAME} | ${(_a = userProfileResult.userProfileDetails.user.displayName) !== null && _a !== void 0 ? _a : 'Profile'}`
    };
}
async function UserProfilePage({ params }) {
    const currentUser = await getUser();
    const { userId } = await params;
    if (!currentUser) {
        (0, navigation_1.redirect)('/');
    }
    const userProfileResult = await getUserProfile(userId);
    if (!("userProfileDetails" in userProfileResult) || ("error" in userProfileResult && userProfileResult.error) || ("userProfileDetails" in userProfileResult && !userProfileResult.userProfileDetails)) {
        return <div>Error: {userProfileResult.error || "Profile not found"}</div>;
    }
    return (<user_profile_1.default currentUser={currentUser} userProfileDetail={userProfileResult.userProfileDetails}/>);
}
//# sourceMappingURL=page.jsx.map