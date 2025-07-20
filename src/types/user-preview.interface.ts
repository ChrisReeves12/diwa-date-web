import { User } from "@/types/user.interface";

export type UserPreview = Pick<User, 'displayName' | 'photos' | 'publicPhotos'
    | 'numOfPhotos' | 'mainPhoto' | 'publicMainPhoto' | 'mainPhotoCroppedImageData' | 'gender'
    | 'lastActiveAt' | 'dateOfBirth' | 'age' | 'createdAt' | 'receivedLikeAt'
    | 'locationName' | 'latitude' | 'longitude' | 'country' | 'isPremium'>
    & { id: number, isOnline?: boolean, blockedThem?: boolean, matchStatus?: string, matchAcceptedAt?: Date, matchId?: number, theyLikedMe?: boolean, lastActiveHumanized?: string, receivedLikeHumanized?: string }
