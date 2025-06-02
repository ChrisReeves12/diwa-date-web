import { User } from "@/types/user.interface";

export type UserPreview = Pick<User, 'displayName' | 'photos' | 'publicPhotos'
    | 'numOfPhotos' | 'mainPhoto' | 'publicMainPhoto' | 'mainPhotoCroppedImageData' | 'gender'
    | 'lastActiveAt' | 'dateOfBirth' | 'age' | 'createdAt' | 'receivedLikeAt'
    | 'locationName' | 'latitude' | 'longitude' | 'country'>
    & { id: number, blockedThem?: boolean, matchStatus?: string, matchAcceptedAt?: string, matchId?: number, theyLikedMe?: boolean }
