import { UserPhoto } from "@/types/user-photo.type";
import { CroppedImageData } from "./cropped-image-data.interface";

export interface NotificationUser {
  id: number,
  locationName: string,
  gender: string,
  displayName: string,
  mainPhotoCroppedImageData?: CroppedImageData,
  publicMainPhoto?: string,
  age: number
}

export interface NotificationPendingMatch {
  id: number;
  receivedAtHumanized: string;
  sender: NotificationUser;
}

export interface NotificationReceivedMessage {
  id: string;
  type: 'message' | 'match';
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
  data: { matchId?: number, content?: string };
  id: number;
  sender?: NotificationUser;
}

export interface NotificationResponse {
  pendingMatches: NotificationPendingMatch[],
  receivedMessages: NotificationReceivedMessage[],
  receivedNotifications: Notification[],
  pendingMatchesCount: number,
  receivedMessagesCount: number,
  notificationCount: number
}
