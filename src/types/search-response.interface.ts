import { UserPreview } from "@/types/user-preview.interface";
import { User } from "./user.interface";

export interface SearchResponse {
    searchResults: UserPreview[];
    hasNextPage: boolean;
    hasError: boolean;
    currentUser: Omit<User, 'password'>;
}
