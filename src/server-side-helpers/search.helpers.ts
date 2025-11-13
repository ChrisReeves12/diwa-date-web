import { SearchFromOrigin, User, UserPhoto } from "@/types";
import { businessConfig } from "@/config/business";
import { SearchSortBy } from "@/types/search-parameters.interface";
import moment from "moment";
import _ from "lodash";
import { LocalityViewport } from "@/types/locality-viewport.interface";
import { getPublicUserDetails } from "@/server-side-helpers/user.helpers";
import { isUserOnline } from "@/helpers/user.helpers";
import { pgDbReadPool } from "@/lib/postgres";
import { SearchResponse } from "@/types/search-response.interface";
import { humanizeTimeDiff } from "@/server-side-helpers/time.helpers";

type DbUserSearchResult = {
    id: number;
    gender: string;
    displayName: string;
    mainPhoto?: string;
    photos?: UserPhoto[];
    dateOfBirth: Date;
    lastActiveAt: Date;
    numOfPhotos: number;
    createdAt: Date;
    seekingGender: string;
    locationName: string;
    matchId?: number;
    matchStatus?: string;
    age: number;
    matchAcceptedAt?: Date;
    blockedThem?: boolean;
    theyLikedMe?: boolean;
    hideOnlineStatus: boolean;
    isPremium: boolean;
};

/**
 * Search users based on given search parameters.
 * @param currentUser
 * @param params
 */
export async function searchUsers(currentUser: Omit<User, 'password'>, params: { page?: number, sortBy?: SearchSortBy }): Promise<SearchResponse> {
    const pageSize = businessConfig.search.pageSize;
    const { page, sortBy } = params;

    const offset = ((page || 1) - 1) * pageSize;
    const minDateOfBirth = moment().subtract(currentUser.seekingMaxAge || businessConfig.defaults.maxAge, 'years').format('YYYY-MM-DD');
    const maxDateOfBirth = moment().subtract(currentUser.seekingMinAge || businessConfig.defaults.minAge, 'years').format('YYYY-MM-DD');
    let locationSearchClause: string = '';
    let countrySearchClause: string = '';

    // Handle geo-bounding box queries
    if ((currentUser.seekingDistanceOrigin === SearchFromOrigin.CurrentLocation && currentUser.locationViewport) || currentUser.seekingDistanceOrigin === SearchFromOrigin.SingleLocation) {
        let viewport = currentUser.seekingDistanceOrigin === SearchFromOrigin.CurrentLocation ? currentUser.locationViewport : currentUser.singleSearchLocation?.selectedLocation?.viewport;
        const country = currentUser.singleSearchLocation?.selectedCountry || currentUser.country!;
        countrySearchClause = `AND U."country" = '${country}'`;

        if (viewport) {
            viewport = expandViewport(viewport, currentUser.seekingMaxDistance || businessConfig.defaults.maxDistance);
            locationSearchClause = `AND ST_INTERSECTS(U."geoPoint", ST_MakeEnvelope(${viewport.low.longitude}, ${viewport.low.latitude}, ${viewport.high.longitude}, ${viewport.high.latitude}, 4326)::geography)`;
        }
    }

    // Handle multiple countries search
    if (currentUser.seekingDistanceOrigin === SearchFromOrigin.MultipleCountries && currentUser.seekingCountries?.length) {
        countrySearchClause = `AND U."country" IN (${currentUser.seekingCountries.map(c => `'${c}'`).join(',')})`;
    }

    if (!countrySearchClause && currentUser.seekingDistanceOrigin !== SearchFromOrigin.AllLocations) {
        countrySearchClause = `AND U."country" = '${currentUser.country}'`;
    }

    const enumeratedQueries = [];
    const searchPreferenceLabels = [
        "ethnicities",
        "religions",
        "languages",
        "interests",
        "maritalStatus",
        "bodyType",
        "hasChildren",
        "wantsChildren",
        "education",
        "smoking",
        "drinking"
    ];

    // Enforce premium restrictions server-side for non-premium users
    let searchUser = currentUser;
    if (!currentUser.isPremium) {
        searchUser = {
            ...currentUser,
            bodyTypePreferences: [],
            languagePreferences: [],
            ethnicPreferences: [],
            religiousPreferences: [],
            interestPreferences: [],
            maritalStatusPreferences: [],
            smokingPreferences: [],
            drinkingPreferences: [],
            hasChildrenPreferences: [],
            wantsChildrenPreferences: [],
            educationPreferences: []
        };
    }

    for (const searchPreferenceLabel of searchPreferenceLabels) {
        const predicate = createEnumeratedPredicate(searchPreferenceLabel, searchUser);
        if (!predicate) continue;

        enumeratedQueries.push(`AND ${predicate}`);
    }

    const searchResults = await pgDbReadPool.query<DbUserSearchResult>(`
        WITH SelectedUsers AS (
            SELECT U."id",
                   U."gender",
                   U."displayName",
                   U."mainPhoto",
                   U."photos",
                   U."dateOfBirth",
                   U."lastActiveAt",
                   U."numOfPhotos",
                   U."createdAt",
                   U."seekingGender",
                   U."locationName",
                   U."hideOnlineStatus",
                   U."isPremium"
            FROM "users" U
            WHERE U."deactivatedAt" IS NULL
              AND U."suspendedAt" IS NULL
              AND U."emailVerifiedAt" IS NOT NULL
              AND U."profileCompletedAt" IS NOT NULL
              AND U."id" != ${currentUser.id}
              AND NOT EXISTS (SELECT 1 FROM "blockedUsers" WHERE "userId" = U."id" AND "blockedUserId" = ${currentUser.id})
              ${countrySearchClause}
              ${locationSearchClause}
              AND U."gender" = '${currentUser.seekingGender}'
              AND U."seekingGender" = '${currentUser.gender}'
              AND U."height" BETWEEN ${currentUser.seekingMinHeight || businessConfig.defaults.minHeight} AND ${currentUser.seekingMaxHeight || businessConfig.defaults.maxHeight}
              AND U."dateOfBirth" BETWEEN '${minDateOfBirth}' AND '${maxDateOfBirth}'
              AND U."numOfPhotos" >= ${currentUser.seekingNumOfPhotos || businessConfig.defaults.numOfPhotos}   
              ${enumeratedQueries.join("\n")}
            LIMIT ${pageSize} OFFSET ${offset})

        SELECT
            SU.*,
            UM."id" AS "matchId",
            UM."status" AS "matchStatus",
            Calculate_Age(SU."dateOfBirth") AS "age",
            UM."acceptedAt" AS "matchAcceptedAt",
            (BU."id" IS NOT NULL) AS "blockedThem",
            (UM."status" = 'pending' AND UM."recipientId" = ${currentUser.id}) AS "theyLikedMe"
        FROM SelectedUsers SU
            LEFT JOIN "userMatches" UM ON (UM."userId" = ${currentUser.id} AND UM."recipientId" = SU.id) OR (UM."userId" = SU.id AND UM."recipientId" = ${currentUser.id})
            LEFT JOIN "blockedUsers" BU ON BU."userId" = ${currentUser.id} AND BU."blockedUserId" = SU.id
        ORDER BY ${resolveSearchSortBy(sortBy || SearchSortBy.LastActive, 'SU')}`);

    return {
        hasError: false,
        searchResults: searchResults.rows.map((userResult) => {
            const publicUserDetails = getPublicUserDetails(userResult);
            const publicUser = Object.assign({}, userResult, publicUserDetails);

            return Object.assign({}, publicUser, {
                lastActiveHumanized: humanizeTimeDiff(userResult.lastActiveAt),
                isOnline: isUserOnline(userResult.lastActiveAt, userResult.hideOnlineStatus)
            });
        }),
        hasNextPage: searchResults.rowCount === pageSize,
        currentUser
    }
}

function resolveSearchSortBy(sortBy: SearchSortBy, alias: string) {
    switch (sortBy) {
        case SearchSortBy.Age: {
            return `${alias}."dateOfBirth" DESC, ${alias}."lastActiveAt" DESC`;
        }

        case SearchSortBy.Newest: {
            return `${alias}."createdAt" DESC, ${alias}."lastActiveAt" DESC`;
        }

        case SearchSortBy.NumberOfPhotos: {
            return `${alias}."numOfPhotos" DESC, ${alias}."lastActiveAt" DESC`;
        }

        default: {
            return `${alias}."lastActiveAt" DESC`;
        }
    }
}

/**
 * Helper to write enumerated SQL predicate for search.
 * @param field
 * @param values
 */
function createEnumeratedPredicate(field: string, user: Omit<User, 'password'>) {
    const prefLookup = {
        "bodyType": "bodyTypePreferences",
        "languages": "languagePreferences",
        "ethnicities": "ethnicPreferences",
        "religions": "religiousPreferences",
        "interests": "interestPreferences",
        "maritalStatus": "maritalStatusPreferences",
        "smoking": "smokingPreferences",
        "drinking": "drinkingPreferences"
    };

    const values = _.get(user, prefLookup[field as keyof typeof prefLookup]);

    if (!values || values.length === 0) {
        return '';
    }

    if (['languages', 'ethnicities', 'religions', 'interests'].includes(field)) {
        return `"${field}" ?| ARRAY[${values.map((v: string) => `'${v}'`).join(',')}]`;
    }

    if (values.length === 1) {
        return `"${field}" = '${values[0]}'`;
    }

    return `"${field}" IN (${values.map((v: string) => `'${v}'`).join(',')})`
}

/**
 * Expands a viewport by the given distance on all sides.
 * @param viewport
 * @param distanceKm
 */
function expandViewport(viewport: LocalityViewport, distanceKm: number): LocalityViewport {
    const calculateLongitudeAdjustment = (latitude: number, distanceKm: number): number => {
        const kmPerDegreeLatitude = 111;
        const kmPerDegreeLongitude = Math.cos(latitude * Math.PI / 180) * kmPerDegreeLatitude;
        return distanceKm / kmPerDegreeLongitude;
    }

    const kmPerDegreeLatitude = 111;
    const latitudeAdjustment = distanceKm / kmPerDegreeLatitude;

    // Calculate longitude adjustments for both low and high points
    const longitudeAdjustmentLow = calculateLongitudeAdjustment(viewport.low.latitude, distanceKm);
    const longitudeAdjustmentHigh = calculateLongitudeAdjustment(viewport.high.latitude, distanceKm);

    // Adjust the latitude and longitude for the viewport
    viewport.low.latitude -= latitudeAdjustment;
    viewport.low.longitude -= longitudeAdjustmentLow;
    viewport.high.latitude += latitudeAdjustment;
    viewport.high.longitude += longitudeAdjustmentHigh;

    return viewport;
}

/**
 * Create a promise for executing search to be consumed by the `use` hook on the home search page.
 * @param currentUser
 * @param searchParams
 */
export async function createSearchPromise(currentUser: User, searchParams: { page?: number, sortBy?: SearchSortBy }) {
    return searchUsers(currentUser, {
        page: Number(searchParams?.page || 1),
        sortBy: searchParams?.sortBy || SearchSortBy.LastActive,
    });
}
