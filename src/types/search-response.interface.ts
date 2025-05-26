import { UserPreview } from "@/types/user-preview.interface";

export interface SearchResponse {
    searchResults: UserPreview[];
    hasNextPage: boolean;
    hasError: boolean;
}
