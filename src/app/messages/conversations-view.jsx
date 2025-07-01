"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConversationsView;
const dashboard_wrapper_1 = __importDefault(require("@/common/dashboard-wrapper/dashboard-wrapper"));
const user_photo_display_1 = __importDefault(require("@/common/user-photo-display/user-photo-display"));
const messages_actions_1 = require("./messages.actions");
const lodash_1 = __importDefault(require("lodash"));
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const use_websocket_1 = require("@/hooks/use-websocket");
function ConversationsView({ currentUser, conversations: initialConversations }) {
    const [conversations, setConversations] = (0, react_1.useState)(initialConversations);
    const [isRefreshing, setIsRefreshing] = (0, react_1.useState)(false);
    const { on, off, isConnected } = (0, use_websocket_1.useWebSocket)();
    // Function to refresh conversations
    const refreshConversations = (0, react_1.useCallback)(async () => {
        try {
            setIsRefreshing(true);
            const result = await (0, messages_actions_1.getConversations)();
            if (result.data) {
                setConversations(result.data);
                (0, messages_actions_1.markConversationsAsAknowledged)(result.data);
            }
        }
        catch (error) {
            console.error('Error refreshing conversations:', error);
        }
        finally {
            setIsRefreshing(false);
        }
    }, []);
    // Handle new message websocket events
    const handleNewMessage = (0, react_1.useCallback)((data) => {
        // Refresh conversations to get updated order and latest messages
        refreshConversations();
    }, [refreshConversations]);
    // Set up websocket event listeners
    (0, react_1.useEffect)(() => {
        if (!isConnected)
            return;
        // Subscribe to message events
        on('message:new', handleNewMessage);
        return () => {
            off('message:new', handleNewMessage);
        };
    }, [isConnected, on, off, handleNewMessage]);
    // Mark matches as read initially
    (0, react_1.useEffect)(() => {
        (0, messages_actions_1.markConversationsAsAknowledged)(conversations);
    }, []);
    return (<dashboard_wrapper_1.default activeTab="messages" currentUser={currentUser}>
            <div className="conversation-list-container">
                {isRefreshing && (<div className="refresh-indicator">
                        <div className="loading-spinner"></div>
                        <span>Updating conversations...</span>
                    </div>)}
                <div className={`conversations-list ${isRefreshing ? 'refreshing' : ''}`}>
                    {conversations.map((match) => {
            var _a;
            const markUnread = match.isUnread || !match.messageContent;
            return (<link_1.default href={`/messages/${match.matchId}`} key={match.matchId} className="conversation-container">
                                <div className="profile-container">
                                    {markUnread &&
                    <div className="unread-message-indicator"/>}
                                    {match.isOnline && <div className="online-lamp"></div>}
                                    <user_photo_display_1.default alt={(_a = match.displayName) !== null && _a !== void 0 ? _a : ''} croppedImageData={match.mainPhotoCroppedImageData} imageUrl={match.publicMainPhoto} gender={match.gender} width={50} height={50}/>
                                </div>
                                <div className={"user-info-section " + (markUnread ? 'unread' : '')}>
                                    <div className="user-name">{match.displayName}</div>
                                    <div className="">
                                        <div className={'last-message'}>
                                            {match.messageContent ?
                    lodash_1.default.truncate(match.messageContent, { length: 85 }) :
                    `Start the chat with ${match.displayName}`}
                                        </div>
                                        <div className="last-sent">
                                            Matched {match.matchCreatedAtHumanized}
                                        </div>
                                    </div>
                                </div>
                            </link_1.default>);
        })}
                </div>
            </div>
        </dashboard_wrapper_1.default>);
}
//# sourceMappingURL=conversations-view.jsx.map