'use client';

import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { ConversationMatch } from "@/server-side-helpers/messages.helpers";
import { markConversationsAsAknowledged, getConversations } from "./messages.actions";
import { User } from "@/types";
import _ from "lodash";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/use-websocket";

export default function ConversationsView({ currentUser, conversations: initialConversations }: {
    currentUser: User, conversations: ConversationMatch[]
}) {
    const [conversations, setConversations] = useState<ConversationMatch[]>(initialConversations);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { on, off, isConnected } = useWebSocket();

    // Function to refresh conversations
    const refreshConversations = useCallback(async () => {
        try {
            setIsRefreshing(true);
            const result = await getConversations();
            if (result.data) {
                setConversations(result.data);
                markConversationsAsAknowledged(result.data);
            }
        } catch (error) {
            console.error('Error refreshing conversations:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    // Handle new message websocket events
    const handleNewMessage = useCallback((data: any) => {
        // Refresh conversations to get updated order and latest messages
        refreshConversations();
    }, [refreshConversations]);

    // Set up websocket event listeners
    useEffect(() => {
        if (!isConnected) return;

        // Subscribe to message events
        on('message:new', handleNewMessage);

        return () => {
            off('message:new', handleNewMessage);
        };
    }, [isConnected, on, off, handleNewMessage]);

    // Mark matches as read initially
    useEffect(() => {
        markConversationsAsAknowledged(conversations);
    }, []);

    return (
        <DashboardWrapper activeTab="messages" currentUser={currentUser}>
            <div className="conversation-list-container">
                {isRefreshing && (
                    <div className="refresh-indicator">
                        <div className="loading-spinner"></div>
                        <span>Updating conversations...</span>
                    </div>
                )}
                <div className={`conversations-list ${isRefreshing ? 'refreshing' : ''}`}>
                    {conversations.length === 0 ? (
                        <div className="no-conversations">
                            <p>You currently have no messages.</p>
                        </div>
                    ) : (
                        conversations.map((match) => {
                            const markUnread = match.isUnread || !match.messageContent;
                            return (
                                <Link
                                    href={`/messages/${match.matchId}`}
                                    key={match.matchId}
                                    className="conversation-container">
                                    <div className="profile-container">
                                        {markUnread &&
                                            <div className="unread-message-indicator" />}
                                        {match.isOnline && <div className="online-lamp"></div>}
                                        <UserPhotoDisplay
                                            alt={match.displayName ?? ''}
                                            croppedImageData={match.mainPhotoCroppedImageData}
                                            imageUrl={match.publicMainPhoto}
                                            gender={match.gender}
                                            width={50}
                                            height={50}
                                        />
                                    </div>
                                    <div className={"user-info-section " + (markUnread ? 'unread' : '')}>
                                        <div className="user-name">{match.displayName}</div>
                                        <div className="">
                                            <div className={'last-message'}>
                                                {match.messageContent ?
                                                    _.truncate(match.messageContent, { length: 85 }) :
                                                    `Start the chat with ${match.displayName}`}
                                            </div>
                                            <div className="last-sent">
                                                Matched {match.matchCreatedAtHumanized}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </DashboardWrapper>
    );
}
