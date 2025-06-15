import { UserPhoto } from "@/types/user-photo.type";
import { CroppedImageData } from "./cropped-image-data.interface";

export interface NotificationUser {
  id: string;
  displayName: string;
  mainPhoto: string;
  photos: UserPhoto[];
  gender: string;
  lastActiveAt: Date;
  locationName: string;
  country: string;
  password: string;
  age: number;
  isSubscriptionActive: boolean;
  publicMainPhoto: string;
  publicPhotos: UserPhoto[];
}

export interface NotificationPendingMatch {
  id: string;
  userId: number;
  recipientId: number;
  status: string;
  acceptedAt: string | null;
  acknowledgedAt: string | null;
  updatedAtTimestamp: string;
  createdAt: string;
  updatedAt: string;
  receivedAtHumanized: string;
  sender: NotificationUser;
}

export interface NotificationReceivedMessage {
  id: string;
  matchId: string;
  content: string;
  readAt?: Date;
  notificationAckAt?: Date;
  mainPhotoCroppedImageData?: CroppedImageData;
  publicMainPhoto?: string;
  userId: string;
  age: number;
  recipientId: string;
  timestamp: number;
  createdAt: Date;
  updatedAt: Date;
  displayName: string;
  mainPhoto: string;
  photos?: UserPhoto[];
  lastActiveAt?: Date;
  suspendedAt?: Date;
  locationName: string;
  userGender: string;
  msgCount: number;
  isLatest: number;
  sentAtHumanized: string;
}

export interface Notification {
  id: string;
  userId: string;
  recipientId: string;
  type: string;
  readAt: string | null;
  data: {
    matchId: number;
  };
  createdAt: string;
  updatedAt: string;
  sender: NotificationUser;
}

export interface NotificationResponse {
  pendingMatches: NotificationPendingMatch[],
  receivedMessages: NotificationReceivedMessage[],
  receivedNotifications: Notification[],
  pendingMatchesCount: number,
  receivedMessagesCount: number,
  notificationCount: number
}
