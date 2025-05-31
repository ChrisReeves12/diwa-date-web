import { SearchFromOrigin, User } from "@/types";
import { businessConfig } from "@/config/business";
import { SearchParameters, SearchSortBy } from "@/types/search-parameters.interface";
import moment from "moment";
import _ from "lodash";
import { LocalityViewport } from "@/types/locality-viewport.interface";
import { prepareUser } from "@/server-side-helpers/user.helpers";
import pgDbPool from "@/lib/postgres";
import { SearchResponse } from "@/types/search-response.interface";

/**
 * Search users based on given search parameters.
 * @param currentUser
 * @param params
 */
export async function searchUsers(currentUser: Pick<User, 'id' | 'locationViewport' | 'country' | 'seekingMaxDistance' | 'gender'>, params: SearchParameters): Promise<SearchResponse> {
    const pageSize = businessConfig.search.pageSize;

    const {
        page,
        seekingMinHeight,
        seekingMaxHeight,
        seekingMaxAge,
        seekingMinAge,
        seekingMaxDistance,
        seekingDistanceOrigin,
        searchFromLocation,
        seekingGender,
        sortBy
    } = params;

    const offset = ((page || 1) - 1) * pageSize;
    const minDateOfBirth = moment().subtract(seekingMaxAge || businessConfig.defaults.maxAge, 'years').format('YYYY-MM-DD');
    const maxDateOfBirth = moment().subtract(seekingMinAge || businessConfig.defaults.minAge, 'years').format('YYYY-MM-DD');
    let locationSearchClause: string = '';
    let countrySearchClause: string = '';

    // Handle geo-bounding box queries
    if ((seekingDistanceOrigin === SearchFromOrigin.CurrentLocation && currentUser.locationViewport) || seekingDistanceOrigin === SearchFromOrigin.SingleLocation) {
        let viewport = seekingDistanceOrigin === SearchFromOrigin.CurrentLocation ? currentUser.locationViewport : searchFromLocation?.selected_location?.viewport;
        const country = searchFromLocation?.selected_country || currentUser.country!;
        countrySearchClause = `AND U."country" = '${country}'`;

        if (viewport) {
            viewport = expandViewport(viewport, seekingMaxDistance || currentUser.seekingMaxDistance);
            locationSearchClause = `AND ST_INTERSECTS(U."geoPoint", ST_MakeEnvelope(${viewport.low.longitude}, ${viewport.low.latitude}, ${viewport.high.longitude}, ${viewport.high.latitude}, 4326)::geography)`;
        }
    }

    // Handle multiple countries search
    if (seekingDistanceOrigin === SearchFromOrigin.MultipleCountries && params.seekingCountries?.length) {
        countrySearchClause = `AND U."country" IN (${params.seekingCountries.map(c => `'${c}'`).join(',')})`;
    }

    if (!countrySearchClause) {
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
        "drinking",
        "seekingCountries"
    ];

    for (const searchPreferenceLabel of searchPreferenceLabels) {
        const predicate = createEnumeratedPredicate(searchPreferenceLabel, _.get(params, searchPreferenceLabel));
        if (!predicate) continue;

        enumeratedQueries.push(`AND ${predicate}`);
    }

    const searchResults = await pgDbPool.query(`
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
                   U."locationName"
            FROM "users" U
            WHERE U."deactivatedAt" IS NULL
              AND U."suspendedAt" IS NULL
              AND U."isUnderReview" = 0
              AND NOT EXISTS (SELECT 1 FROM "blockedUsers" WHERE "userId" = U."id" AND "blockedUserId" = ${currentUser.id})
              ${countrySearchClause}
              ${locationSearchClause}
              AND U."gender" = '${seekingGender}'
              AND U."seekingGender" = '${currentUser.gender}'
              AND U."height" BETWEEN ${seekingMinHeight || businessConfig.defaults.minHeight} AND ${seekingMaxHeight || businessConfig.defaults.maxHeight}
              AND U."dateOfBirth" BETWEEN '${minDateOfBirth}' AND '${maxDateOfBirth}'
              ${enumeratedQueries.join("\n")}
            ORDER BY U."${resolveSearchSortBy(sortBy)}" DESC LIMIT ${pageSize} OFFSET ${offset})

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
    `);

    return { hasError: false, searchResults: searchResults.rows.map((row: any) => prepareUser(row)), hasNextPage: searchResults.rowCount === pageSize }
}

function resolveSearchSortBy(sortBy: SearchSortBy) {
    switch (sortBy) {
        case SearchSortBy.Age: {
            return 'dateOfBirth';
        }

        case SearchSortBy.Newest: {
            return 'createdAt';
        }

        case SearchSortBy.NumberOfPhotos: {
            return 'numOfPhotos';
        }

        default: {
            return 'lastActiveAt';
        }
    }
}

/**
 * Helper to write enumerated SQL predicate for search.
 * @param field
 * @param values
 */
function createEnumeratedPredicate(field: string, values?: string[]) {
    if (!values || values.length === 0) {
        return '';
    }

    if (['languages', 'ethnicities', 'religions', 'interests'].includes(field)) {
        return `"${field}" ?| ARRAY[${values.map(v => `'${v}'`).join(',')}]`;
    }

    if (values.length === 1) {
        return `"${field}" = '${values[0]}'`;
    }

    return `"${field}" IN (${values.map(v => `'${v}'`).join(',')})`
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
        seekingMinAge: currentUser.seekingMinAge || businessConfig.defaults.minAge,
        seekingMaxAge: currentUser.seekingMaxAge || businessConfig.defaults.maxAge,
        seekingMinHeight: currentUser.seekingMinHeight || businessConfig.defaults.minHeight,
        seekingMaxHeight: currentUser.seekingMaxHeight || businessConfig.defaults.maxHeight,
        numberOfPhotos: currentUser.seekingNumOfPhotos || businessConfig.defaults.numOfPhotos,
        ethnicities: currentUser.ethnicPreferences,
        religions: currentUser.religiousPreferences,
        languages: currentUser.languagePreferences,
        interests: currentUser.interestPreferences,
        maritalStatus: currentUser.maritalStatusPreferences,
        bodyType: currentUser.bodyTypePreferences,
        hasChildren: currentUser.hasChildrenPreferences,
        wantsChildren: currentUser.wantsChildrenPreferences,
        education: currentUser.educationPreferences,
        smoking: currentUser.smokingPreferences,
        drinking: currentUser.drinkingPreferences,
        seekingCountries: currentUser.seekingCountries,
        seekingDistanceOrigin: currentUser.seekingDistanceOrigin as SearchFromOrigin,
        seekingMaxDistance: currentUser.seekingMaxDistance,
        seekingGender: currentUser.seekingGender || "",
        sortBy: searchParams?.sortBy || SearchSortBy.LastActive,
        searchFromLocation: currentUser.seekingDistanceOrigin === SearchFromOrigin.SingleLocation ? currentUser.singleSearchLocation : undefined
    });
}
