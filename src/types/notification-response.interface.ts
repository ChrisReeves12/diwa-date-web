import { UserPhoto } from "@/types/user-photo.type";
import { CroppedImageData } from "./cropped-image-data.interface";

interface NotificationUser {
  id: string;
  display_name: string;
  main_photo: string;
  photos: UserPhoto[];
  gender: string;
  last_active_at: Date;
  location_name: string;
  country: string;
  password: string;
  age: number;
  is_subscription_active: boolean;
  public_main_photo: string;
  public_photos: UserPhoto[];
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
  match_id: string;
  content: string;
  read_at?: Date;
  notification_ack_at?: Date;
  main_photo_cropped_image_data?: CroppedImageData;
  public_main_photo?: string;
  user_id: string;
  age: number;
  recipient_id: string;
  timestamp: number;
  created_at: Date;
  updated_at: Date;
  display_name: string;
  main_photo: string;
  photos?: UserPhoto[];
  last_active_at?: Date;
  suspended_at?: Date;
  location_name: string;
  user_gender: string;
  msg_count: number;
  is_latest: number;
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
