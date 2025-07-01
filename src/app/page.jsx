"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = Home;
const guest_home_1 = __importDefault(require("@/app/guest-home/guest-home"));
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const home_search_1 = __importDefault(require("@/app/home-search/home-search"));
const search_helpers_1 = require("@/server-side-helpers/search.helpers");
const headers_1 = require("next/headers");
const react_1 = require("react");
// Cache the user data to avoid duplicate fetching
const getUser = (0, react_1.cache)(async () => {
    return (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
});
async function generateMetadata() {
    const currentUser = await getUser();
    return {
        title: currentUser ? `${process.env.APP_NAME} | Search` : process.env.APP_NAME
    };
}
async function Home({ searchParams }) {
    const currentUser = await getUser();
    if (currentUser) {
        (0, user_helpers_1.refreshLastActive)(currentUser).then();
    }
    const lSearchParams = await searchParams;
    return (currentUser ?
        <home_search_1.default searchPromise={(0, search_helpers_1.createSearchPromise)(currentUser, lSearchParams)} currentUser={currentUser} /> : <guest_home_1.default />);
}
//# sourceMappingURL=page.jsx.map