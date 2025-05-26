import { SearchFromOrigin } from "@/types/user.interface";
import { SingleSearchLocation } from "@/types/single-search-location.type";

export enum SearchSortBy {
    Newest = 'newest',
    Age = 'age',
    NumberOfPhotos = 'numOfPhotos',
    LastActive = 'lastActive'
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
    seekingGender: string;
    sortBy: SearchSortBy,
    search_from_location?: SingleSearchLocation
}
