import { SearchFromOrigin } from "@/types/user.interface";
import { SingleSearchLocation } from "@/types/single-search-location.type";

export enum SearchSortBy {
    Newest = 'newest',
    Age = 'age',
    NumberOfPhotos = 'numOfPhotos',
    LastActive = 'lastActive'
}

export interface SearchParameters {
    seekingMinAge?: number;
    seekingMaxAge?: number;
    seekingMinHeight?: number;
    seekingMaxHeight?: number;
    numberOfPhotos?: number;
    ethnicities?: string[];
    religions?: string[];
    languages?: string[];
    interests?: string[];
    maritalStatus?: string[];
    bodyType?: string[];
    hasChildren?: string[];
    wantsChildren?: string[];
    education?: string[];
    smoking?: string[];
    drinking?: string[];
    seekingCountries?: string[];
    seekingDistanceOrigin: SearchFromOrigin;
    seekingMaxDistance?: number;
    searchFromLocation?: SingleSearchLocation
}
