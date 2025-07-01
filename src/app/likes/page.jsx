"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = LikesPage;
const likes_view_1 = __importDefault(require("@/app/likes/likes-view"));
const navigation_1 = require("next/navigation");
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const headers_1 = require("next/headers");
require("./likes.scss");
const likes_sort_by_enum_1 = require("@/types/likes-sort-by.enum");
async function generateMetadata() {
    return {
        title: `${process.env.APP_NAME} | Likes`
    };
}
async function LikesPage({ searchParams }) {
    const currentUser = await (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
    if (!currentUser) {
        (0, navigation_1.redirect)('/');
    }
    const lSearchParams = await searchParams;
    const sortBy = lSearchParams.sortBy || likes_sort_by_enum_1.LikesSortBy.ReceivedAt;
    const page = Number(lSearchParams.page) || 1;
    const getLikesPromise = (0, user_helpers_1.getUserLikes)(Number(currentUser.id), sortBy, page);
    return (<likes_view_1.default likesPromise={getLikesPromise} currentUser={currentUser}/>);
}
//# sourceMappingURL=page.jsx.map