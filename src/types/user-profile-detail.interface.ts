import { User } from "./user.interface";

export interface UserProfileDetail {
    user: Pick<User,
        | "id"
        | "publicPhotos"
        | "displayName"
        | "mainPhotoCroppedImageData"
        | "publicMainPhoto"
        | "gender"
        | "age"
        | "locationName"
        | "isFoundingMember"
        | "bio"
        | "lastActiveAt"
        | "hideOnlineStatus"
        | "isPremium"
    >;
    theyBlockedMe: boolean;
    suspendedAt?: Date;
    matchIsTowardsMe: boolean;
    matchStatus?: string;
    seekingLabel: string;
    maritalStatusLabel: string;
    ethnicityLabel: string;
    heightLabel: string;
    bodyTypeLabel: string;
    religionLabel: string;
    drinkingLabel: string;
    smokingLabel: string;
    educationLabel: string;
    hasChildrenLabel: string;
    wantsChildrenLabel: string;
    lastActiveHumanized: string;
    matchId?: number;
    blockedThem: boolean;
    interestLabels: {
        emoji: string;
        label: string;
    }[];
}
