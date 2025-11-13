'use client';

import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { ConversationMatch } from "@/server-side-helpers/messages.helpers";
import { markConversationsAsAknowledged, getConversations } from "./messages.actions";
import { User } from "@/types";
import _ from "lodash";
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { WebSocketMessage } from '../../../types/websocket-events.types';
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { HeartBrokenIcon, InfoCircleIcon } from "react-line-awesome";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { removeUserMatch } from "@/common/server-actions/user-profile.actions";
import { showAlert } from "@/util";

export default function ConversationsView({ currentUser, conversations: initialConversations }: {
    currentUser: User, conversations: ConversationMatch[]
}) {
    const [conversations, setConversations] = useState<ConversationMatch[]>(initialConversations);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
    const [isUpdatingMatch, setIsUpdatingMatch] = useState(false);
    const [userBeingUnMatched, setUserBeingUnMatched] = useState<{ recipientId: number, displayName: string } | undefined>();
    const conversationsRefreshTrigger$ = useRef(new Subject<void>()).current;
    const conversationsRefreshSubRef = useRef<Subscription | null>(null);
    const { on, isConnected } = useWebSocket();

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

    // Trigger refetching conversations
    useEffect(() => {
        conversationsRefreshSubRef.current = conversationsRefreshTrigger$
            .pipe(debounceTime(300))
            .subscribe(() => {
                refreshConversations();
            });

        return () => {
            conversationsRefreshSubRef.current?.unsubscribe();
            conversationsRefreshSubRef.current = null;
        };
    }, [refreshConversations, conversationsRefreshTrigger$]);

    const onUnMatchClick = (recipientId: number, displayName: string) => {
        setShowUnmatchDialog(true);
        setUserBeingUnMatched({ recipientId, displayName });
    };

    const handleUnmatch = async (e: any) => {
        e.preventDefault();
        setShowUnmatchDialog(false);
        setIsUpdatingMatch(true);

        setTimeout(async () => {
            try {
                if (userBeingUnMatched) {
                    await removeUserMatch(userBeingUnMatched.recipientId);
                    conversationsRefreshTrigger$.next();
                }
            } catch (e) {
                showAlert('An error occurred while removing match. Please try again later', 'An Error Occurred');
            } finally {
                setIsUpdatingMatch(false);
            }
        }, 500);
    }

    // Set up websocket event listeners
    useEffect(() => {
        if (!isConnected) return;

        const debounceTimeMs = 300;
        const subscriptions = [
            on('message:notification')
                .pipe(
                    debounceTime(debounceTimeMs),
                    filter((data: WebSocketMessage) =>
                        data.eventLabel === 'message:new' &&
                        conversations.some(c => Number(c.matchId) === Number(data.payload.matchId))
                    )
                )
                .subscribe(() => conversationsRefreshTrigger$.next()),

            on('match:notification')
                .pipe(
                    debounceTime(debounceTimeMs),
                    filter((data: WebSocketMessage) =>
                        ['match:new', 'match:cancel'].includes(data.eventLabel) &&
                        conversations.some(c =>
                            Number(c.matchId) === Number(data.payload.id))
                    )
                )
                .subscribe(() => conversationsRefreshTrigger$.next())
        ];

        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    }, [isConnected, on, refreshConversations, currentUser.id]);

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
                            <p><InfoCircleIcon /> You currently have no messages.</p>
                        </div>
                    ) : (
                        conversations.map((match) => {
                            const markUnread = match.isUnread || !match.messageContent;
                            return (
                                <div key={match.matchId} className="conversation-container">
                                    <Link
                                        style={{ pointerEvents: isUpdatingMatch && userBeingUnMatched?.recipientId === match.userId ? 'none' : 'inherit' }}
                                        className="conversation-link"
                                        href={`/messages/${match.matchId}`}>
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
                                    <div className="controls-container">
                                        {isUpdatingMatch && userBeingUnMatched?.recipientId === match.userId ? <CircularProgress />
                                            : <button onClick={() => onUnMatchClick(match.userId, match.displayName)}>
                                                <HeartBrokenIcon /> Unmatch
                                            </button>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            {userBeingUnMatched && <Dialog
                open={showUnmatchDialog}
                onClose={() => setShowUnmatchDialog(false)}
                aria-labelledby="unmatch-dialog-title"
            >
                <DialogTitle id="unmatch-dialog-title">
                    Unmatch Confirmation
                </DialogTitle>
                <DialogContent>
                    Are you sure you want to unmatch with {userBeingUnMatched.displayName}? This action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowUnmatchDialog(false);
                        setUserBeingUnMatched(undefined);
                    }} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleUnmatch} color="error" variant="contained" disabled={isUpdatingMatch}>
                        {isUpdatingMatch ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : 'Unmatch'}
                    </Button>
                </DialogActions>
            </Dialog>}
        </DashboardWrapper>
    );
}
