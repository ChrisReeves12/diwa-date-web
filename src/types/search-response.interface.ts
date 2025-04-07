import { UserPreview } from "@/types/user-preview.interface";

export interface SearchResponse {
    searchResults: UserPreview[];
    totalCount: number;
    pageCount: number;
}
