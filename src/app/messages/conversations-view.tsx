'use client';

import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { ConversationMatch } from "@/server-side-helpers/messages.helpers";
import { markConversationsAsAknowledged } from "./messages.actions";
import { User } from "@/types";
import _ from "lodash";
import Link from "next/link";
import { useEffect } from "react";

export default function ConversationsView({ currentUser, conversations }: {
    currentUser: User, conversations: ConversationMatch[]
}) {
    // Mark matches as read
    useEffect(() => {
        markConversationsAsAknowledged(conversations);
    }, []);

    return (
        <DashboardWrapper activeTab="messages" currentUser={currentUser}>
            <div className="conversation-list-container">
                <div className="conversations-list">
                    {conversations.map((match) => {
                        const markUnread = match.isUnread || !match.messageContent;
                        return (
                            <Link
                                href={`/messages/${match.matchId}`}
                                key={match.matchId}
                                className="conversation-container">
                                <div className="profile-container">
                                    {markUnread &&
                                        <div className="unread-message-indicator" />}
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
                    })}
                </div>
            </div>
        </DashboardWrapper>
    );
}