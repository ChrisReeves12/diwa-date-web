import { User } from "@/types";

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

export interface ChatMessage {
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

export interface ChatViewProps {
    currentUser: User;
    matchDetails: MatchDetails;
}
