import { User } from "@/types/user.interface";

export type UserPreview = Pick<User, 'display_name' | 'photos'
    | 'num_of_photos' | 'main_photo' | 'public_main_photo' | 'main_photo_cropped_image_data' | 'gender'
    | 'last_active_at' | 'date_of_birth' | 'age' | 'created_at'
    | 'location_name' | 'latitude' | 'longitude' | 'country'>
    & {id: number, i_blocked_them?: boolean, they_blocked_me?: boolean, match_status?: string, match_accepted_at?: string, match_id?: number, they_liked_me?: boolean}
