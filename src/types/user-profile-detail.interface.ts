import { User } from "./user.interface";

export interface UserProfileDetail {
    user: Omit<User, "password">;
    theyBlockedMe: boolean;
    blockedThem: boolean;
    matchStatus?: string;
    matchIsTowardsMe?: boolean;
    matchId?: number;
    seekingLabel?: string;
    maritalStatusLabel: string;
    interestLabels: { emoji: string, label: string }[];
    wantsChildrenLabel: string;
    hasChildrenLabel: string;
    educationLabel: string;
    smokingLabel: string;
    drinkingLabel: string;
    religionLabel: string;
    bodyTypeLabel: string;
    heightLabel: string;
    ethnicityLabel: string;
    matchAcceptedAt?: string;
    suspendedAt?: Date;
}
