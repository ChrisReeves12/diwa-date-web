"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = MessageConversationPage;
const navigation_1 = require("next/navigation");
const headers_1 = require("next/headers");
const user_helpers_1 = require("@/server-side-helpers/user.helpers");
const messages_helpers_1 = require("@/server-side-helpers/messages.helpers");
const chat_view_1 = __importDefault(require("./chat-view"));
async function generateMetadata({ params }) {
    return {
        title: `${process.env.APP_NAME} | Message`
    };
}
async function MessageConversationPage({ params }) {
    const currentUser = await (0, user_helpers_1.getCurrentUser)(await (0, headers_1.cookies)());
    if (!currentUser) {
        (0, navigation_1.redirect)('/');
    }
    const resolvedParams = await params;
    const matchIdNumber = parseInt(resolvedParams.matchId, 10);
    if (isNaN(matchIdNumber)) {
        (0, navigation_1.redirect)('/messages');
    }
    // Fetch match details on the server
    const matchDetailsResult = await (0, messages_helpers_1.getMatchDetails)(matchIdNumber, currentUser.id);
    if (matchDetailsResult.error) {
        (0, navigation_1.redirect)('/messages');
    }
    return (<chat_view_1.default currentUser={currentUser} matchDetails={matchDetailsResult.data}/>);
}
//# sourceMappingURL=page.jsx.map