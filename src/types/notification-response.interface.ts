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
  user_id: string;
  recipient_id: string;
  status: string;
  accepted_at: string | null;
  acknowledged_at: string | null;
  updated_at_timestamp: string;
  created_at: string;
  updated_at: string;
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
}

export interface Notification {
  id: string;
  user_id: string;
  recipient_id: string;
  type: string;
  read_at: string | null;
  data: {
    match_id: number;
  };
  created_at: string;
  updated_at: string;
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
