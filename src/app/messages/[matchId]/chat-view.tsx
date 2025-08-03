'use client';

import './chat-view.scss';
import { useEffect, useState, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { User } from "@/types";
import { getChatMessages, sendChatMessage, markChatAsRead } from "../messages.actions";
import { useWebSocket } from '@/hooks/use-websocket';
import { isToday, formatChatDate } from '@/server-side-helpers/time.helpers';
import { isUserOnline } from '@/helpers/user.helpers';

interface MatchDetails {
    matchId: number;
    matchStatus: string;
    matchCreatedAt: string;
    matchUpdatedAt: string;
    otherUser: {
        id: number;
        displayName: string;
        gender: string;
        lastActiveAt: string;
        mainPhoto: string;
        photos: any[];
        profileDetail: any;
        mainPhotoCroppedImageData: any;
        publicMainPhoto: any;
        hideOnlineStatus: boolean;
    };
}

interface ChatMessage {
    id: number;
    content: string;
    userId: number;
    recipientId: number;
    timestamp: number;
    createdAt: string;
    readAt: string;
    sender: {
        id: number;
        displayName: string;
        gender: string;
        lastActiveAt: string;
        mainPhoto: string;
        photos: any[];
        profileDetail: any;
    };
    isFromCurrentUser: boolean;
}

interface ChatViewProps {
    currentUser: User;
    matchDetails: MatchDetails;
}

export default function ChatView({ currentUser, matchDetails }: ChatViewProps) {
    const params = useParams();
    const router = useRouter();
    const matchId = params.matchId as string;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const needsFocusRef = useRef(false);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const { on, off, isConnected, sendMessage, emit } = useWebSocket();

    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Scroll to bottom function
    const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
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
            } else {
                textarea.style.height = `${maxHeight}px`;
                textarea.style.overflowY = 'auto';
            }
        }
    };

    const loadMoreMessages = useCallback(async () => {
        if (!hasMoreMessages || isLoadingMore || messages.length === 0) return;

        setIsLoadingMore(true);
        try {
            const pageSize = parseInt(process.env.CHAT_MESSAGES_PAGE_SIZE || '20', 10);
            const oldestMessage = messages[0];
            const result = await getChatMessages(matchId, {
                cursor: oldestMessage.id,
                limit: pageSize,
                direction: 'before'
            });

            if (result.data && result.data.length > 0) {
                const messageList = messageListRef.current;
                const oldScrollHeight = messageList?.scrollHeight || 0;
                const oldScrollTop = messageList?.scrollTop || 0;

                setMessages(prev => {
                    const existingIds = new Set(prev.map(msg => msg.id));
                    const newMessages = (result.data || []).filter(msg => !existingIds.has(msg.id));
                    return [...newMessages, ...prev];
                });

                // Restore scroll position after DOM update
                if (messageList) {
                    setTimeout(() => {
                        const newScrollHeight = messageList.scrollHeight;
                        messageList.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
                    }, 0);
                }
            } else {
                setHasMoreMessages(false);
            }
        } catch (err) {
            // Handle error silently for now
            console.error('Failed to load older messages:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [hasMoreMessages, isLoadingMore, messages, matchId]);

    useEffect(() => {
        const fetchInitialMessages = async () => {
            try {
                const pageSize = parseInt(process.env.CHAT_MESSAGES_PAGE_SIZE || '20', 10);
                const result = await getChatMessages(matchId, { limit: pageSize });

                if (result.error) {
                    setMessagesError(result.error);
                } else {
                    setMessages(result.data || []);
                    if ((result.data || []).length < pageSize) {
                        setHasMoreMessages(false);
                    }
                }
            } catch (err) {
                setMessagesError('Failed to load messages');
            } finally {
                setMessagesLoading(false);
            }
        };

        if (matchId) {
            fetchInitialMessages();
        }
    }, [matchId]);

    // Mark messages as read when chat loads or new messages arrive
    useEffect(() => {
        const markAsRead = async () => {
            if (!messagesLoading && messages.length > 0) {
                try {
                    await markChatAsRead(matchId);
                    // Notify other users that messages have been read
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage && !lastMessage.isFromCurrentUser) {
                        emit('message:markRead', {
                            messageId: lastMessage.id.toString(),
                            conversationId: matchId.toString()
                        });
                    }
                    // Dispatch an event to notify the notification center to refresh
                    window.dispatchEvent(new CustomEvent('notification-center-refresh'));
                } catch (error) {
                    console.error('Error marking messages as read:', error);
                    // Don't show this error to user as it's not critical
                }
            }
        };

        markAsRead();
    }, [messagesLoading, matchId, messages.length, emit]);

    // Scroll to bottom on initial load
    useEffect(() => {
        if (!messagesLoading && messages.length > 0) {
            setTimeout(() => scrollToBottom('auto'), 100);
        }
    }, [messagesLoading]);

    // Handle scroll for pagination
    useEffect(() => {
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
    useEffect(() => {
        autoResizeTextarea();
    }, [messageInput]);

    // Handle focus after input is cleared
    useLayoutEffect(() => {
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
    const handleTypingStatus = useCallback((data: { userId: string; conversationId: string; isTyping: boolean }) => {
        // Only update typing status if it's from the other user in this match
        if (data.conversationId === matchId.toString() && parseInt(data.userId) !== currentUser.id) {
            setOtherUserTyping(data.isTyping);
        }
    }, [matchId, currentUser.id]);

    // Create a stable callback for handling new messages
    const handleNewMessage = useCallback((data: any) => {
        const messageMatchId = data.conversationId || data.matchId || data.match_id || data.conversation_id;

        if (messageMatchId && messageMatchId.toString() === matchId.toString()) {
            const lastMessage = messages[messages.length - 1];
            const options: { cursor?: number; direction?: 'before' | 'after' } = lastMessage
                ? { cursor: lastMessage.id, direction: 'after' }
                : {};

            getChatMessages(matchId, options).then(result => {
                if (result.data && result.data.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(msg => msg.id));
                        const newMessages = (result.data || []).filter(msg => !existingIds.has(msg.id));
                        return [...prev, ...newMessages];
                    });

                    const messageList = messageListRef.current;
                    if (messageList && messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 200) {
                        setTimeout(() => scrollToBottom(), 100);
                    }

                    markChatAsRead(matchId).catch(error => {
                        console.error('Error marking messages as read after WebSocket event:', error);
                    });
                }
            }).catch(error => {
                console.error('Error refetching messages after WebSocket event:', error);
            });
        }
    }, [matchId, messages]);

    // Stable WebSocket event handlers
    const messageHandler = useMemo(() => ({
        handleNewMessage,
        handleTypingStatus
    }), [handleNewMessage, handleTypingStatus]);

    // WebSocket room management and event subscriptions
    useEffect(() => {
        if (!isConnected || !matchId) {
            return;
        }

        // Join the conversation room for messages and typing events
        const roomId = `conversation:${matchId}`;
        emit('room:join', { roomId });

        // Set up event listeners
        const typingHandler = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
            messageHandler.handleTypingStatus(data);
        };

        const readHandler = (data: { messageId: string; conversationId: string; readBy: string; timestamp: Date }) => {
            if (data.conversationId === matchId.toString() && data.readBy !== currentUser.id.toString()) {
                // Update the readAt timestamp for all messages up to this one
                setMessages(prev => prev.map(msg => ({
                    ...msg,
                    readAt: msg.id <= parseInt(data.messageId) ? new Date(data.timestamp).toISOString() : msg.readAt
                })));
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
    const handleTyping = useCallback(() => {
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
    const stopTyping = useCallback(() => {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        setIsTyping(false);
        emit('message:typing:stop', {
            conversationId: matchId.toString()
        });
    }, [emit, matchId, typingTimeout]);

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout]);

    const handleBackClick = () => {
        router.push('/messages');
    };

    const formatMessageTime = (createdAt: string) => {
        const date = new Date(createdAt);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
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
            const result = await sendChatMessage(matchId, messageContent);

            if (result.error) {
                setSendError(result.error);
            } else {
                // Clear the input on successful send
                setMessageInput('');
                // Set flag to refocus after render
                needsFocusRef.current = true;

                // No need to refetch all, just append the new message optimistically
                // or wait for WebSocket to deliver it. For now, let's refetch just the newest.
                const lastMessage = messages[messages.length - 1];
                const options: { cursor?: number; direction?: 'before' | 'after' } = lastMessage
                    ? { cursor: lastMessage.id, direction: 'after' }
                    : {};
                const updatedMessages = await getChatMessages(matchId, options);
                if (updatedMessages.data) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(msg => msg.id));
                        const newMessages = (updatedMessages.data || []).filter(msg => !existingIds.has(msg.id));
                        return [...prev, ...newMessages];
                    });
                    setTimeout(() => scrollToBottom(), 100);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setSendError('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    // Handle new lines
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageInput(e.target.value);
        handleTyping();
    };

    const { otherUser } = matchDetails;
    const isOnline = isUserOnline(new Date(otherUser.lastActiveAt), otherUser.hideOnlineStatus);

    return (
        <DashboardWrapper activeTab="messages" currentUser={currentUser}>
            <div className="chat-container">
                {/* Chat Header */}
                <div className="chat-header">
                    <button
                        className="back-button"
                        onClick={handleBackClick}
                        aria-label="Back to conversations"
                    >
                        ←
                    </button>

                    <Link href={`/user/${otherUser.id}`} className="user-info">
                        <UserPhotoDisplay
                            alt={otherUser.displayName}
                            croppedImageData={otherUser.mainPhotoCroppedImageData}
                            imageUrl={otherUser.publicMainPhoto}
                            gender={otherUser.gender}
                            width={40}
                            height={40}
                        />

                        <div className="user-details">
                            <div className="user-name">{otherUser.displayName}</div>
                            <div className="online-status">
                                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                                <span className="status-text">
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Messages List */}
                <div className="message-list" ref={messageListRef}>
                    {messagesLoading ? (
                        <div className="messages-loading">
                            <div className="loading-spinner"></div>
                            <span>Loading messages...</span>
                        </div>
                    ) : messagesError ? (
                        <div className="messages-error">
                            <p>{messagesError}</p>
                        </div>
                    ) : (
                        <div className="messages-container">
                            {isLoadingMore && (
                                <div className="messages-loading more">
                                    <div className="loading-spinner"></div>
                                </div>
                            )}
                            {!hasMoreMessages && messages.length > 0 && (
                                <div className="no-more-messages">
                                    <p>This is the beginning of your conversation.</p>
                                </div>
                            )}
                            {messages.length === 0 && !messagesLoading && (
                                <div className="no-messages">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            )}
                            {/* Group messages by date */}
                            {(() => {
                                const messagesByDate = new Map<string, ChatMessage[]>();

                                messages.forEach(message => {
                                    const date = new Date(message.createdAt);
                                    const dateKey = isToday(date) ? 'Today' : formatChatDate(date);

                                    if (!messagesByDate.has(dateKey)) {
                                        messagesByDate.set(dateKey, []);
                                    }
                                    messagesByDate.get(dateKey)!.push(message);
                                });

                                return Array.from(messagesByDate.entries()).map(([dateKey, dateMessages]) => (
                                    <div key={dateKey}>
                                        <div className="date-section-header">
                                            <span className="date-label">{dateKey}</span>
                                        </div>
                                        {dateMessages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`message-bubble ${message.isFromCurrentUser ? 'from-me' : 'from-them'}`}
                                            >
                                                {!message.isFromCurrentUser && (
                                                    <Link href={`/user/${message.sender.id}`} className="message-avatar">
                                                        {isOnline && <div className="online-lamp"></div>}
                                                        <UserPhotoDisplay
                                                            alt={message.sender.displayName}
                                                            croppedImageData={message.sender.profileDetail?.mainPhotoCroppedImageData}
                                                            imageUrl={message.sender.profileDetail?.publicMainPhoto}
                                                            gender={message.sender.gender}
                                                            width={32}
                                                            height={32}
                                                        />
                                                    </Link>
                                                )}

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
                                                 message.id === messages[messages.length - 1]?.id &&
                                                 message.readAt && (
                                                    <div className="seen-indicator">
                                                        <span className="seen-text">Seen</span>
                                                        <span className="seen-time">
                                                            {formatMessageTime(message.readAt)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ));
                            })()}
                            {/* Show typing indicator */}
                            {otherUserTyping && (
                                <div className="message-bubble from-them typing-indicator">
                                    <div className="message-content">
                                        <div className="typing-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Invisible element to scroll to */}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Message Input Area */}
                <div className="message-input-area">
                    {sendError && (
                        <div className="send-error">
                            <span className="error-text">{sendError}</span>
                            <button
                                className="dismiss-error"
                                onClick={() => setSendError(null)}
                                aria-label="Dismiss error"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="message-input-form">
                        <div className="input-container">
                            <textarea
                                ref={textareaRef}
                                value={messageInput}
                                onChange={handleInputChange}
                                onKeyDown={handleInputKeyDown}
                                placeholder={`Message ${otherUser.displayName}...`}
                                className="message-input"
                                rows={1}
                                maxLength={1000}
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                className={`send-button ${(!messageInput.trim() || isSending) ? 'disabled' : ''}`}
                                disabled={!messageInput.trim() || isSending}
                                aria-label="Send message"
                            >
                                {isSending ? (
                                    <div className="send-spinner"></div>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22,2 15,22 11,13 2,9"></polygon>
                                    </svg>
                                )}
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
        </DashboardWrapper>
    );
}
