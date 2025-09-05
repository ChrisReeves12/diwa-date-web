'use client';

import './chat-view-desktop.scss';
import './chat-view-mobile.scss';
import { ChatMessage, ChatViewProps } from "@/app/messages/[matchId]/chat-view-props.type";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import {
    getChatMessages,
    updateMessagesAsRead,
    sendChatMessage,
    sendReadReceipt,
    sendTypingNotification
} from "@/app/messages/messages.actions";
import { isUserOnline } from "@/helpers/user.helpers";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import { ArrowLeftIcon, TimesCircleIcon, TimesIcon } from "react-line-awesome";
import Link from "next/link";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { formatChatDate, isToday } from "@/server-side-helpers/time.helpers";
import _ from "lodash";
import { WebSocketMessage } from "../../../../types/websocket-events.types";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { showAlert } from "@/util";

export function ChatView({currentUser, matchDetails}: ChatViewProps) {
    const params = useParams();
    const router = useRouter();
    const matchId = params.matchId as string;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mobileMessageInputAreaRef = useRef<HTMLDivElement>(null);
    const mobileMessageListRef = useRef<HTMLDivElement>(null);
    const needsFocusRef = useRef(false);
    const isMobile = window.innerWidth <= 768;
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const {on, isConnected, emit} = useWebSocket();
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const disableTypingIndicator$ = useRef<Subject<any>>(new Subject<any>());

    // Scroll to bottom function
    const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
        if (isMobile) {
            if (typeof window !== 'undefined') {
                window.scrollTo({top: document.body.scrollHeight - window.innerHeight, behavior});
            }
        } else {
            messagesEndRef.current?.scrollIntoView({behavior});
        }
    };

    const markAsRead = useCallback(async () => {
        if (!messagesLoading && messages.length > 0) {
            try {
                await updateMessagesAsRead(matchId);

                // Notify other users that messages have been read
                const lastMessage = _.last(messages);
                if (lastMessage && !lastMessage.isFromCurrentUser) {
                    sendReadReceipt(lastMessage.userId, Number(matchId), lastMessage.id)
                        .catch((err) => console.error('Error sending read receipt:', err));
                }

                window.dispatchEvent(new CustomEvent('notification-center-refresh'));
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        }
    }, [messagesLoading, messages, matchId]);

    const loadMessages = useCallback(async (options?: {
        cursor?: number;
        direction?: 'before' | 'after';
        limit?: number
    }) => {
        const isLoadingMore = !!options?.cursor;

        if (isLoadingMore) {
            if (messages.length === 0) return;
            setIsLoadingMore(true);
        } else {
            setMessagesLoading(true);
            setMessagesError(null);
        }

        try {
            const pageSize = options?.limit || 20;
            const result = await getChatMessages(matchId, {
                cursor: options?.cursor,
                limit: pageSize,
                direction: options?.direction || 'before'
            });

            if (result.error) {
                if (!isLoadingMore) {
                    setMessagesError(result.error);
                }
            } else {
                const newMessages = result.data || [];

                if (isLoadingMore && options?.direction === 'before') {
                    // Loading older messages
                    if (newMessages.length > 0) {
                        const messageList = messageListRef.current;
                        const oldScrollHeight = messageList?.scrollHeight || 0;
                        const oldScrollTop = messageList?.scrollTop || 0;

                        setMessages(prev => {
                            const existingIds = new Set(prev.map(msg => msg.id));
                            const filteredMessages = newMessages.filter(msg => !existingIds.has(msg.id));
                            return [...filteredMessages, ...prev];
                        });

                        // Restore scroll position after DOM update
                        if (messageList) {
                            setTimeout(() => {
                                const newScrollHeight = messageList.scrollHeight;
                                messageList.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
                            }, 0);
                        }
                    }
                } else if (isLoadingMore && options?.direction === 'after') {
                    // Loading newer messages
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(msg => msg.id));
                        const filteredMessages = newMessages.filter(msg => !existingIds.has(msg.id));
                        return [...prev, ...filteredMessages];
                    });

                    // Scroll to the bottom if the user is near the bottom
                    let shouldScroll = true;

                    if (isMobile) {
                        const windowTop = window.scrollY || window.pageYOffset;
                        const innerHeight = window.innerHeight;
                        const bodyHeight = document.body.scrollHeight;

                        shouldScroll = (bodyHeight - innerHeight - windowTop) < 420;
                    } else {
                        const messageList = messageListRef.current;
                        if (messageList) {
                            const scrollTop = messageList.scrollTop;
                            const clientHeight = messageList.clientHeight;
                            const scrollHeight = messageList.scrollHeight;

                            shouldScroll = (scrollHeight - clientHeight - scrollTop) < 420;
                        }
                    }

                    if (shouldScroll) {
                        setTimeout(() => scrollToBottom('smooth'), 200);
                    }
                } else {
                    // Initial load
                    setMessages(newMessages);
                    setTimeout(() => scrollToBottom(), 200);
                }
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
            if (!isLoadingMore) {
                setMessagesError('Failed to load messages');
            }
        } finally {
            if (isLoadingMore) {
                setIsLoadingMore(false);
            } else {
                setMessagesLoading(false);
            }
        }
    }, [isLoadingMore, messages, matchId]);

    const handleMessageRead = useCallback((data: WebSocketMessage) => {
        const {payload} = data;

        if (payload.conversationId === matchId.toString() && payload.readBy !== currentUser.id.toString()) {
            // Update the readAt timestamp for all messages up to this one
            setMessages(prev => prev.map(msg => ({
                ...msg,
                readAt: msg.id <= parseInt(payload.messageId) ? new Date(payload.timestamp).toISOString() : msg.readAt
            })));
        }
    }, [matchId, currentUser.id]);

    const handleReceivedMessage = useCallback(async (data: WebSocketMessage) => {
        setOtherUserTyping(false);
        const {payload} = data;
        const messageMatchId = payload.conversationId || payload.matchId || payload.match_id || payload.conversation_id;

        if (messageMatchId && messageMatchId.toString() === matchId.toString()) {
            const lastMessage = _.last(messages);
            const options = lastMessage
                ? {cursor: lastMessage.id, direction: 'after' as const, limit: 20}
                : undefined;

            try {
                await loadMessages(options);
                await updateMessagesAsRead(matchId);
            } catch (error) {
                console.error('Error loading messages or marking as read after WebSocket event:', error);
            }
        }
    }, [matchId, messages, loadMessages]);

    const handleBackClick = useCallback(() => {
        router.push('/messages');
    }, [router]);

    const formatMessageTime = (createdAt: string) => {
        const date = new Date(createdAt);
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    const handleSendMessage = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!messageInput.trim() || isSending) {
            return;
        }

        const messageContent = messageInput.trim();
        setIsSending(true);
        setSendError(null);

        try {
            const result = await sendChatMessage(matchId, messageContent);

            if (result.error) {
                setSendError(result.error);
            } else {
                setMessageInput('');
                needsFocusRef.current = true;

                const lastMessage = messages[messages.length - 1];
                const options = lastMessage
                    ? {cursor: lastMessage.id, direction: 'after' as const, limit: 20}
                    : undefined;

                await loadMessages(options);
                setTimeout(() => scrollToBottom(), 200);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setSendError('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    }, [messageInput, isSending, matchId, sendChatMessage, messages, loadMessages, scrollToBottom]);

    // Handle new lines
    const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    }, [handleSendMessage]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageInput(e.target.value);
        sendTypingNotification(matchDetails.otherUser.id, currentUser.id);
    }, []);

    const {otherUser} = matchDetails;
    const isOnline = isUserOnline(new Date(otherUser.lastActiveAt), otherUser.hideOnlineStatus);

    // Initial load of messages
    useEffect(() => {
        if (matchId) {
            loadMessages();
        }
    }, []);

    // Mark messages as read when chat loads or new messages arrive
    useEffect(() => {
        markAsRead();
    }, [messages.length, markAsRead]);

    // Handle scroll for pagination
    useEffect(() => {
        const messageList = messageListRef.current;
        const handleScroll = () => {
            if (messageList && messageList.scrollTop < 100) {
                const oldestMessage = messages[0];
                if (oldestMessage) {
                    loadMessages({
                        cursor: oldestMessage.id,
                        direction: 'before',
                        limit: 20
                    });
                }
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
    }, [loadMessages, messages]);

    // Auto-resize textarea when input changes
    useEffect(() => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = isMobile ? 72 : 120;

            if (scrollHeight <= maxHeight) {
                textarea.style.height = `${scrollHeight}px`;
                textarea.style.overflowY = 'hidden';
            } else {
                textarea.style.height = `${maxHeight}px`;
                textarea.style.overflowY = 'auto';
            }

            if (isMobile && mobileMessageListRef.current && mobileMessageInputAreaRef.current) {
                mobileMessageListRef.current.style.paddingBottom = `${mobileMessageInputAreaRef.current.clientHeight + 5}px`;
            }
        }
    }, [messageInput]);

    // Subscribe to real-time message events
    useEffect(() => {
        if (!isConnected || !matchId) {
            return;
        }

        const messageSubscription = on('message:notification').subscribe((data: WebSocketMessage) => {
            switch (data.eventLabel) {
                case 'message:new':
                    handleReceivedMessage(data);
                    break;
                case 'message:typing':
                    setOtherUserTyping(true);
                    disableTypingIndicator$.current.next(new Date());
                    break;
                case 'message:read':
                    handleMessageRead(data);
                    break;
            }
        });

        const accountSubscription = on('account:notification').subscribe((data: WebSocketMessage) => {
            switch (data.eventLabel) {
                case 'account:blocked':
                    if (data.payload.blockedUserId === currentUser.id && data.payload.blockedBy === otherUser.id) {
                        showAlert('You have been blocked by this user. You can no longer send messages to them.');
                    }
                    break;
                case 'account:unblocked':
                    if (data.payload.unblockedUserId === currentUser.id && data.payload.unblockedBy === otherUser.id) {
                        showAlert('You have been unblocked by this user. You can now send messages to them.');
                    }
                    break;
            }
        });

        const matchSubscription = on('match:notification').subscribe((data: WebSocketMessage) => {
            if (data.eventLabel === 'match:cancel' && (data.payload.canceledBy === otherUser.id || data.payload.canceledBy === currentUser.id)) {
                showAlert('This match has been canceled. You can no longer send messages to this user.');
                router.push('/messages');
            }
        });

        return () => {
            messageSubscription.unsubscribe();
            accountSubscription.unsubscribe();
            matchSubscription.unsubscribe();
        };
    }, [isConnected, matchId, on, emit, currentUser.id, messages]);

    // Handle focus after input is cleared
    useLayoutEffect(() => {
        if (!isMobile && needsFocusRef.current && textareaRef.current) {
            setTimeout(() => {
                if (textareaRef.current && needsFocusRef.current) {
                    textareaRef.current.focus();
                    needsFocusRef.current = false;
                }
            }, 400);
        }
    });

    useEffect(() => {
        const typingSubscription = disableTypingIndicator$.current
            .asObservable()
            .pipe(debounceTime(2000))
            .subscribe(() => {
                setOtherUserTyping(false);
            });

        return () => typingSubscription.unsubscribe();
    }, [setOtherUserTyping]);

    return (
        isMobile ? <DashboardWrapper activeTab="messages" currentUser={currentUser}>
            <div className="chat-view-mobile-container">
                {/* Chat Header */}
                <div className="chat-view-header">
                    <div className="back-button-container">
                        <Link href="/messages">
                            <ArrowLeftIcon/>
                        </Link>
                    </div>
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

                    {isMobile && otherUserTyping && <div className="typing-indicator">
                        <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>}
                </div>

                {/* Text Container */}
                <div className="textarea-container">
                    <div ref={mobileMessageInputAreaRef} className="message-input-area">
                        {sendError && (
                            <div className="send-error">
                                <span className="error-text">{sendError}</span>
                                <button
                                    className="dismiss-error"
                                    onClick={() => setSendError(null)}
                                    aria-label="Dismiss error"
                                >
                                    <TimesCircleIcon size={'2x'}/>
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="message-input-form">
                            <div className="input-container">
                                <textarea
                                    ref={textareaRef}
                                    value={messageInput}
                                    onChange={handleInputChange}
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
                                    aria-label="Send message">
                                    {isSending ? (
                                        <div className="send-spinner"></div>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2">
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
                            </div>
                        </form>
                    </div>
                </div>

                {/* Message List */}
                <div ref={mobileMessageListRef} className="message-list">
                    <div className="messages-container">
                        {messages.length > 0 && (
                            <div className="no-more-messages">
                                <p>This is the beginning of your conversation.</p>
                            </div>
                        )}
                        {messages.length === 0 && !messagesLoading && (
                            <div className="no-messages">
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        )}
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
                                            className={`message-bubble ${message.isFromCurrentUser ? 'from-me' : 'from-them'}`}>
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
                        {otherUserTyping && !isMobile && (
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
                        {isLoadingMore && (
                            <div className="messages-loading more">
                                <div className="loading-spinner"></div>
                            </div>
                        )}
                        {messagesLoading && <div className="messages-loading">
                            <div className="loading-spinner"></div>
                            <span>Loading messages...</span>
                        </div>}
                    </div>
                </div>
            </div>
        </DashboardWrapper> : <DashboardWrapper activeTab="messages" currentUser={currentUser}>
            <div className="chat-container">
                <div className="chat-header">
                    <button
                        className="back-button"
                        onClick={handleBackClick}
                        aria-label="Back to conversations">
                        <ArrowLeftIcon/>
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
                            {messages.length > 0 && (
                                <div className="no-more-messages">
                                    <p>This is the beginning of your conversation.</p>
                                </div>
                            )}
                            {messages.length === 0 && !messagesLoading && (
                                <div className="no-messages">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            )}
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
                                                className={`message-bubble ${message.isFromCurrentUser ? 'from-me' : 'from-them'}`}>
                                                {!message.isFromCurrentUser && (
                                                    <Link href={`/user/${message.sender.id}`}
                                                          className="message-avatar">
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
                            <div ref={messagesEndRef}/>
                        </div>
                    )}
                </div>


                <div className="message-input-area">
                    {sendError && (
                        <div className="send-error">
                            <span className="error-text">{sendError}</span>
                            <button
                                className="dismiss-error"
                                onClick={() => setSendError(null)}
                                aria-label="Dismiss error"
                            >
                                <TimesIcon size={'lg'}/>
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
                                aria-label="Send message">
                                {isSending ? (
                                    <div className="send-spinner"></div>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                         stroke="currentColor" strokeWidth="2">
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
