"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatView;
require("./chat-view.scss");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const dashboard_wrapper_1 = __importDefault(require("@/common/dashboard-wrapper/dashboard-wrapper"));
const user_photo_display_1 = __importDefault(require("@/common/user-photo-display/user-photo-display"));
const messages_actions_1 = require("../messages.actions");
const use_websocket_1 = require("@/hooks/use-websocket");
const time_helpers_1 = require("@/server-side-helpers/time.helpers");
const user_helpers_1 = require("@/helpers/user.helpers");
function ChatView({ currentUser, matchDetails }) {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const matchId = params.matchId;
    const messagesEndRef = (0, react_1.useRef)(null);
    const messageListRef = (0, react_1.useRef)(null);
    const textareaRef = (0, react_1.useRef)(null);
    const needsFocusRef = (0, react_1.useRef)(false);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [messagesLoading, setMessagesLoading] = (0, react_1.useState)(true);
    const [messagesError, setMessagesError] = (0, react_1.useState)(null);
    const [messageInput, setMessageInput] = (0, react_1.useState)('');
    const [isSending, setIsSending] = (0, react_1.useState)(false);
    const [sendError, setSendError] = (0, react_1.useState)(null);
    const [otherUserTyping, setOtherUserTyping] = (0, react_1.useState)(false);
    const [typingTimeout, setTypingTimeout] = (0, react_1.useState)(null);
    const { on, off, isConnected, sendMessage, emit } = (0, use_websocket_1.useWebSocket)();
    const [hasMoreMessages, setHasMoreMessages] = (0, react_1.useState)(true);
    const [isLoadingMore, setIsLoadingMore] = (0, react_1.useState)(false);
    const [isTyping, setIsTyping] = (0, react_1.useState)(false);
    // Scroll to bottom function
    const scrollToBottom = (behavior = 'smooth') => {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior });
    };
    // Auto-resize textarea function
    const autoResizeTextarea = () => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.style.height = 'auto'; // Reset height to calculate scrollHeight
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 120; // Max height in pixels (about 6 lines)
            if (scrollHeight <= maxHeight) {
                textarea.style.height = `${scrollHeight}px`;
                textarea.style.overflowY = 'hidden';
            }
            else {
                textarea.style.height = `${maxHeight}px`;
                textarea.style.overflowY = 'auto';
            }
        }
    };
    const loadMoreMessages = (0, react_1.useCallback)(async () => {
        if (!hasMoreMessages || isLoadingMore || messages.length === 0)
            return;
        setIsLoadingMore(true);
        try {
            const pageSize = parseInt(process.env.CHAT_MESSAGES_PAGE_SIZE || '20', 10);
            const oldestMessage = messages[0];
            const result = await (0, messages_actions_1.getChatMessages)(matchId, {
                cursor: oldestMessage.id,
                limit: pageSize,
                direction: 'before'
            });
            if (result.data && result.data.length > 0) {
                const messageList = messageListRef.current;
                const oldScrollHeight = (messageList === null || messageList === void 0 ? void 0 : messageList.scrollHeight) || 0;
                const oldScrollTop = (messageList === null || messageList === void 0 ? void 0 : messageList.scrollTop) || 0;
                setMessages(prev => [...(result.data || []), ...prev]);
                // Restore scroll position after DOM update
                if (messageList) {
                    setTimeout(() => {
                        const newScrollHeight = messageList.scrollHeight;
                        messageList.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
                    }, 0);
                }
            }
            else {
                setHasMoreMessages(false);
            }
        }
        catch (err) {
            // Handle error silently for now
            console.error('Failed to load older messages:', err);
        }
        finally {
            setIsLoadingMore(false);
        }
    }, [hasMoreMessages, isLoadingMore, messages, matchId]);
    (0, react_1.useEffect)(() => {
        const fetchInitialMessages = async () => {
            try {
                const pageSize = parseInt(process.env.CHAT_MESSAGES_PAGE_SIZE || '20', 10);
                const result = await (0, messages_actions_1.getChatMessages)(matchId, { limit: pageSize });
                if (result.error) {
                    setMessagesError(result.error);
                }
                else {
                    setMessages(result.data || []);
                    if ((result.data || []).length < pageSize) {
                        setHasMoreMessages(false);
                    }
                }
            }
            catch (err) {
                setMessagesError('Failed to load messages');
            }
            finally {
                setMessagesLoading(false);
            }
        };
        if (matchId) {
            fetchInitialMessages();
        }
    }, [matchId]);
    // Mark messages as read when chat loads or new messages arrive
    (0, react_1.useEffect)(() => {
        const markAsRead = async () => {
            if (!messagesLoading && messages.length > 0) {
                try {
                    await (0, messages_actions_1.markChatAsRead)(matchId);
                    // Notify other users that messages have been read
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage && !lastMessage.isFromCurrentUser) {
                        emit('message:markRead', {
                            messageId: lastMessage.id.toString(),
                            conversationId: matchId.toString()
                        });
                    }
                    // Dispatch an event to notify the notification center to refresh
                    window.dispatchEvent(new CustomEvent('messages-read'));
                }
                catch (error) {
                    console.error('Error marking messages as read:', error);
                    // Don't show this error to user as it's not critical
                }
            }
        };
        markAsRead();
    }, [messagesLoading, matchId, messages.length, emit]);
    // Scroll to bottom on initial load
    (0, react_1.useEffect)(() => {
        if (!messagesLoading && messages.length > 0) {
            setTimeout(() => scrollToBottom('auto'), 100);
        }
    }, [messagesLoading]);
    // Handle scroll for pagination
    (0, react_1.useEffect)(() => {
        const messageList = messageListRef.current;
        const handleScroll = () => {
            if (messageList && messageList.scrollTop < 100) {
                loadMoreMessages();
            }
        };
        if (messageList) {
            messageList.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (messageList) {
                messageList.removeEventListener('scroll', handleScroll);
            }
        };
    }, [loadMoreMessages]);
    // Auto-resize textarea when input changes
    (0, react_1.useEffect)(() => {
        autoResizeTextarea();
    }, [messageInput]);
    // Handle focus after input is cleared
    (0, react_1.useLayoutEffect)(() => {
        if (needsFocusRef.current && textareaRef.current) {
            setTimeout(() => {
                if (textareaRef.current && needsFocusRef.current) {
                    textareaRef.current.focus();
                    needsFocusRef.current = false;
                }
            }, 150);
        }
    });
    // Handle typing status updates
    const handleTypingStatus = (0, react_1.useCallback)((data) => {
        // Only update typing status if it's from the other user in this match
        if (data.conversationId === matchId.toString() && parseInt(data.userId) !== currentUser.id) {
            setOtherUserTyping(data.isTyping);
        }
    }, [matchId, currentUser.id]);
    // Create a stable callback for handling new messages
    const handleNewMessage = (0, react_1.useCallback)((data) => {
        const messageMatchId = data.conversationId || data.matchId || data.match_id || data.conversation_id;
        if (messageMatchId && messageMatchId.toString() === matchId.toString()) {
            const lastMessage = messages[messages.length - 1];
            const options = lastMessage
                ? { cursor: lastMessage.id, direction: 'after' }
                : {};
            (0, messages_actions_1.getChatMessages)(matchId, options).then(result => {
                if (result.data && result.data.length > 0) {
                    setMessages(prev => [...prev, ...(result.data || [])]);
                    const messageList = messageListRef.current;
                    if (messageList && messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 200) {
                        setTimeout(() => scrollToBottom(), 100);
                    }
                    (0, messages_actions_1.markChatAsRead)(matchId).catch(error => {
                        console.error('Error marking messages as read after WebSocket event:', error);
                    });
                }
            }).catch(error => {
                console.error('Error refetching messages after WebSocket event:', error);
            });
        }
    }, [matchId, messages]);
    // Stable WebSocket event handlers
    const messageHandler = (0, react_1.useMemo)(() => ({
        handleNewMessage,
        handleTypingStatus
    }), [handleNewMessage, handleTypingStatus]);
    // WebSocket room management and event subscriptions
    (0, react_1.useEffect)(() => {
        if (!isConnected || !matchId) {
            return;
        }
        // Join the conversation room for messages and typing events
        const roomId = `conversation:${matchId}`;
        emit('room:join', { roomId });
        // Set up event listeners
        const typingHandler = (data) => {
            messageHandler.handleTypingStatus(data);
        };
        const readHandler = (data) => {
            if (data.conversationId === matchId.toString() && data.readBy !== currentUser.id.toString()) {
                // Update the readAt timestamp for all messages up to this one
                setMessages(prev => prev.map(msg => (Object.assign(Object.assign({}, msg), { readAt: msg.id <= parseInt(data.messageId) ? new Date(data.timestamp).toISOString() : msg.readAt }))));
            }
        };
        on('message:new', messageHandler.handleNewMessage);
        on('message:typing', typingHandler);
        on('message:read', readHandler);
        return () => {
            // Leave room
            emit('room:leave', { roomId });
            // Remove event listeners
            off('message:new', messageHandler.handleNewMessage);
            off('message:typing', typingHandler);
            off('message:read', readHandler);
        };
    }, [isConnected, matchId, on, off, emit, messageHandler, currentUser.id]);
    // Handle input typing events with debounce
    const handleTyping = (0, react_1.useCallback)(() => {
        if (!isConnected) {
            return;
        }
        setIsTyping(true);
        emit('message:typing:start', {
            conversationId: matchId.toString()
        });
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        const timeout = setTimeout(() => {
            setIsTyping(false);
            emit('message:typing:stop', {
                conversationId: matchId.toString()
            });
        }, 2000);
        setTypingTimeout(timeout);
    }, [emit, matchId, typingTimeout, isConnected]);
    // Stop typing when message is sent
    const stopTyping = (0, react_1.useCallback)(() => {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        setIsTyping(false);
        emit('message:typing:stop', {
            conversationId: matchId.toString()
        });
    }, [emit, matchId, typingTimeout]);
    // Cleanup typing timeout on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout]);
    const handleBackClick = () => {
        router.push('/messages');
    };
    const formatMessageTime = (createdAt) => {
        const date = new Date(createdAt);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || isSending) {
            return;
        }
        // Stop typing indicator when sending message
        stopTyping();
        const messageContent = messageInput.trim();
        setIsSending(true);
        setSendError(null);
        try {
            const result = await (0, messages_actions_1.sendChatMessage)(matchId, messageContent);
            if (result.error) {
                setSendError(result.error);
            }
            else {
                // Clear the input on successful send
                setMessageInput('');
                // Set flag to refocus after render
                needsFocusRef.current = true;
                // No need to refetch all, just append the new message optimistically
                // or wait for WebSocket to deliver it. For now, let's refetch just the newest.
                const lastMessage = messages[messages.length - 1];
                const options = lastMessage
                    ? { cursor: lastMessage.id, direction: 'after' }
                    : {};
                const updatedMessages = await (0, messages_actions_1.getChatMessages)(matchId, options);
                if (updatedMessages.data) {
                    setMessages(prev => [...prev, ...(updatedMessages.data || [])]);
                    setTimeout(() => scrollToBottom(), 100);
                }
            }
        }
        catch (error) {
            console.error('Error sending message:', error);
            setSendError('Failed to send message. Please try again.');
        }
        finally {
            setIsSending(false);
        }
    };
    // Handle new lines
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };
    const handleInputChange = (e) => {
        setMessageInput(e.target.value);
        handleTyping();
    };
    const { otherUser } = matchDetails;
    const isOnline = (0, user_helpers_1.isUserOnline)(new Date(otherUser.lastActiveAt), otherUser.hideOnlineStatus);
    return (<dashboard_wrapper_1.default activeTab="messages" currentUser={currentUser}>
            <div className="chat-container">
                {/* Chat Header */}
                <div className="chat-header">
                    <button className="back-button" onClick={handleBackClick} aria-label="Back to conversations">
                        ←
                    </button>

                    <link_1.default href={`/user/${otherUser.id}`} className="user-info">
                        <user_photo_display_1.default alt={otherUser.displayName} croppedImageData={otherUser.mainPhotoCroppedImageData} imageUrl={otherUser.publicMainPhoto} gender={otherUser.gender} width={40} height={40}/>

                        <div className="user-details">
                            <div className="user-name">{otherUser.displayName}</div>
                            <div className="online-status">
                                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                                <span className="status-text">
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </link_1.default>
                </div>

                {/* Messages List */}
                <div className="message-list" ref={messageListRef}>
                    {messagesLoading ? (<div className="messages-loading">
                            <div className="loading-spinner"></div>
                            <span>Loading messages...</span>
                        </div>) : messagesError ? (<div className="messages-error">
                            <p>{messagesError}</p>
                        </div>) : (<div className="messages-container">
                            {isLoadingMore && (<div className="messages-loading more">
                                    <div className="loading-spinner"></div>
                                </div>)}
                            {!hasMoreMessages && messages.length > 0 && (<div className="no-more-messages">
                                    <p>This is the beginning of your conversation.</p>
                                </div>)}
                            {messages.length === 0 && !messagesLoading && (<div className="no-messages">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>)}
                            {/* Group messages by date */}
                            {(() => {
                const messagesByDate = new Map();
                messages.forEach(message => {
                    const date = new Date(message.createdAt);
                    const dateKey = (0, time_helpers_1.isToday)(date) ? 'Today' : (0, time_helpers_1.formatChatDate)(date);
                    if (!messagesByDate.has(dateKey)) {
                        messagesByDate.set(dateKey, []);
                    }
                    messagesByDate.get(dateKey).push(message);
                });
                return Array.from(messagesByDate.entries()).map(([dateKey, dateMessages]) => (<div key={dateKey}>
                                        <div className="date-section-header">
                                            <span className="date-label">{dateKey}</span>
                                        </div>
                                        {dateMessages.map((message) => {
                        var _a, _b, _c;
                        return (<div key={message.id} className={`message-bubble ${message.isFromCurrentUser ? 'from-me' : 'from-them'}`}>
                                                {!message.isFromCurrentUser && (<link_1.default href={`/user/${message.sender.id}`} className="message-avatar">
                                                        {isOnline && <div className="online-lamp"></div>}
                                                        <user_photo_display_1.default alt={message.sender.displayName} croppedImageData={(_a = message.sender.profileDetail) === null || _a === void 0 ? void 0 : _a.mainPhotoCroppedImageData} imageUrl={(_b = message.sender.profileDetail) === null || _b === void 0 ? void 0 : _b.publicMainPhoto} gender={message.sender.gender} width={32} height={32}/>
                                                    </link_1.default>)}

                                                <div className="message-content">
                                                    <div className="message-text">
                                                        {message.content}
                                                    </div>
                                                    <div className="message-time">
                                                        {formatMessageTime(message.createdAt)}
                                                    </div>
                                                </div>
                                                {/* Show seen indicator for the last message from current user */}
                                                {message.isFromCurrentUser &&
                                message.id === ((_c = messages[messages.length - 1]) === null || _c === void 0 ? void 0 : _c.id) &&
                                message.readAt && (<div className="seen-indicator">
                                                        <span className="seen-text">Seen</span>
                                                        <span className="seen-time">
                                                            {formatMessageTime(message.readAt)}
                                                        </span>
                                                    </div>)}
                                            </div>);
                    })}
                                    </div>));
            })()}
                            {/* Show typing indicator */}
                            {otherUserTyping && (<div className="message-bubble from-them typing-indicator">
                                    <div className="message-content">
                                        <div className="typing-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>)}
                            {/* Invisible element to scroll to */}
                            <div ref={messagesEndRef}/>
                        </div>)}
                </div>

                {/* Message Input Area */}
                <div className="message-input-area">
                    {sendError && (<div className="send-error">
                            <span className="error-text">{sendError}</span>
                            <button className="dismiss-error" onClick={() => setSendError(null)} aria-label="Dismiss error">
                                ✕
                            </button>
                        </div>)}
                    <form onSubmit={handleSendMessage} className="message-input-form">
                        <div className="input-container">
                            <textarea ref={textareaRef} value={messageInput} onChange={handleInputChange} onKeyDown={handleInputKeyDown} placeholder={`Message ${otherUser.displayName}...`} className="message-input" rows={1} maxLength={1000} disabled={isSending}/>
                            <button type="submit" className={`send-button ${(!messageInput.trim() || isSending) ? 'disabled' : ''}`} disabled={!messageInput.trim() || isSending} aria-label="Send message">
                                {isSending ? (<div className="send-spinner"></div>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22,2 15,22 11,13 2,9"></polygon>
                                    </svg>)}
                            </button>
                        </div>
                        <div className="input-info">
                            <span className="character-count">
                                {messageInput.length}/1000
                            </span>
                            <span className="input-hint">
                                Press Enter to send, Shift+Enter for new line
                            </span>
                        </div>
                    </form>
                </div>
            </div>
        </dashboard_wrapper_1.default>);
}
//# sourceMappingURL=chat-view.jsx.map