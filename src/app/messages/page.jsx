"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = MessageConversationsPage;
require("./messages.scss");
const navigation_1 = require("next/navigation");
const headers_1 = require("next/headers");
const conversations_view_1 = __importDefault(require("./conversations-view"));
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const messages_helpers_1 = require("@/server-side-helpers/messages.helpers");
async function generateMetadata() {
    return {
        title: `${process.env.APP_NAME} | Messages`
    };
}
async function MessageConversationsPage() {
    const currentUser = await (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
    if (!currentUser) {
        (0, navigation_1.redirect)('/');
    }
    return <conversations_view_1.default conversations={await (0, messages_helpers_1.getConversationsFromMatches)(currentUser.id)} currentUser={currentUser}/>;
}
//# sourceMappingURL=page.jsx.map