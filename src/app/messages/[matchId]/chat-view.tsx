'use client';

import './chat-view.scss';
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { User } from "@/types";
import { getChatMessages, sendChatMessage, getChatMatchDetails, markChatAsRead } from "../messages.actions";

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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const needsFocusRef = useRef(false);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    // Scroll to bottom function
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const result = await getChatMessages(matchId);

                if (result.error) {
                    setMessagesError(result.error);
                } else {
                    setMessages(result.data || []);
                }
            } catch (err) {
                setMessagesError('Failed to load messages');
            } finally {
                setMessagesLoading(false);
            }
        };

        if (matchId) {
            fetchMessages();
        }
    }, [matchId]);

    // Mark messages as read when chat loads
    useEffect(() => {
        const markAsRead = async () => {
            if (!messagesLoading && messages.length > 0) {
                try {
                    await markChatAsRead(matchId);
                } catch (error) {
                    console.error('Error marking messages as read:', error);
                    // Don't show this error to user as it's not critical
                }
            }
        };

        markAsRead();
    }, [messagesLoading, matchId]); // Run when loading finishes

    // Scroll to bottom when messages load or when new messages arrive
    useEffect(() => {
        if (!messagesLoading && messages.length > 0) {
            // Use setTimeout to ensure DOM is updated
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [messages, messagesLoading]);

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

    const handleBackClick = () => {
        router.push('/messages');
    };

    const isUserOnline = (lastActiveAt: string) => {
        if (!lastActiveAt) return false;
        const lastActive = new Date(lastActiveAt);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
        return diffInMinutes <= 10; // Online if active within last 10 minutes
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

        const messageContent = messageInput.trim();
        setIsSending(true);
        setSendError(null);

        try {
            // Send the message using server action
            const result = await sendChatMessage(matchId, messageContent);

            if (result.error) {
                setSendError(result.error);
            } else {
                // Clear the input on successful send
                setMessageInput('');

                // Set flag to refocus after render
                needsFocusRef.current = true;

                // Refresh messages to show the new message
                const updatedMessages = await getChatMessages(matchId);
                if (updatedMessages.data) {
                    setMessages(updatedMessages.data);
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
    };

    const { otherUser } = matchDetails;
    const isOnline = isUserOnline(otherUser.lastActiveAt);

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

                    <div className="user-info">
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
                    </div>
                </div>

                {/* Messages List */}
                <div className="message-list">
                    {messagesLoading ? (
                        <div className="messages-loading">
                            <div className="loading-spinner"></div>
                            <span>Loading messages...</span>
                        </div>
                    ) : messagesError ? (
                        <div className="messages-error">
                            <p>{messagesError}</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="no-messages">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        <div className="messages-container">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`message-bubble ${message.isFromCurrentUser ? 'from-me' : 'from-them'}`}
                                >
                                    {!message.isFromCurrentUser && (
                                        <div className="message-avatar">
                                            <UserPhotoDisplay
                                                alt={message.sender.displayName}
                                                croppedImageData={message.sender.profileDetail?.mainPhotoCroppedImageData}
                                                imageUrl={message.sender.profileDetail?.publicMainPhoto}
                                                gender={message.sender.gender}
                                                width={32}
                                                height={32}
                                            />
                                        </div>
                                    )}

                                    <div className="message-content">
                                        <div className="message-text">
                                            {message.content}
                                        </div>
                                        <div className="message-time">
                                            {formatMessageTime(message.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            ))}
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