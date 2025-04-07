import { SearchFromOrigin } from "@/types/user.interface";
import { LocalityViewport } from "@/types/locality-viewport.interface";

export enum SearchSortBy {
    Newest = 'newest',
    Age = 'age',
    NumberOfPhotos = 'num_of_photos',
    LastActive = 'last_active'
}

export interface SearchParameters {
    page?: number;
    seeking_min_age?: number;
    seeking_max_age?: number;
    seeking_min_height?: number;
    seeking_max_height?: number;
    number_of_photos?: number;
    ethnicities?: string[];
    religions?: string[];
    languages?: string[];
    interests?: string[];
    marital_status?: string[];
    body_type?: string[];
    has_children?: string[];
    wants_children?: string[];
    education?: string[];
    smoking?: string[];
    drinking?: string[];
    seeking_countries?: string[];
    seeking_distance_origin: SearchFromOrigin;
    seeking_max_distance?: number;
    seeking_genders: string[];
    sort_by: SearchSortBy,
    search_from_location?: {
        viewport?: LocalityViewport,
        search_countries?: string[]
    }
}
