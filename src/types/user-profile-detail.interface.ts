import { User } from "./user.interface";

export interface UserProfileDetail {
    user: Omit<User, "password">;
    they_blocked_me: boolean;
    blocked_them: boolean;
    match_status?: string;
    match_is_towards_me?: boolean;
    match_id?: number;
    seeking_label?: string;
    marital_status_label: string;
    interest_labels: { emoji: string, label: string }[];
    wants_children_label: string;
    has_children_label: string;
    education_label: string;
    smoking_label: string;
    drinking_label: string;
    religion_label: string;
    body_type_label: string;
    height_label: string;
    ethnicity_label: string;
    match_accepted_at?: string;
    suspended_at?: Date;
}
