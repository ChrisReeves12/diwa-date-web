import { SearchFromOrigin, User } from "@/types";
import https from 'https';
import axios from 'axios';
import prisma from "@/lib/prisma";
import { businessConfig } from "@/config/business";
import { logError } from "@/server-side-helpers/logging.helpers";
import { SearchParameters, SearchSortBy } from "@/types/search-parameters.interface";
import moment from "moment";
import _ from "lodash";
import { LocalityViewport } from "@/types/locality-viewport.interface";
import { transformBigInts } from "@/util";
import { UserPreview } from "@/types/user-preview.interface";
import { UserSearchDoc } from "@/types/user-search-doc.interface";
import {
    appendMediaRootToImage,
    appendMediaRootToImageUrl,
    calculateUserAge,
    getMainCroppedImageData
} from "@/server-side-helpers/user.helpers";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 20
});

/**
 * Indexes a user into the search index.
 * @param user
 */
export async function indexUserForSearch(user: User) {
    const usersIndex = process.env.ELASTICSEARCH_USER_INDEX;
    const elasticSearchRoot = process.env.ELASTICSEARCH_BASE_URL;

    const blockedUserIds = await prisma.blocked_users.findMany({
        where: {
            user_id: user.id
        },
        select: {
            blocked_user_id: true
        }
    });

    const whoBlockedMeIds = await prisma.blocked_users.findMany({
        where: {
            blocked_user_id: user.id
        },
        select: {
            user_id: true
        }
    })

    const blockedIds = new Set(blockedUserIds.map(v => Number(v.blocked_user_id.toString())));
    for (const whoBlockedMeId of whoBlockedMeIds) {
        blockedIds.add(Number(whoBlockedMeId.user_id.toString()))
    }

    try {
        const indexResponse = await axios.post(
            `${elasticSearchRoot}/${usersIndex}/_doc/${user.id}`,
            {
                id: Number(user.id.toString()),
                display_name: user.display_name,
                first_name: user.first_name,
                last_name: user.last_name,
                main_photo: user.main_photo,
                photos: user.photos,
                number_of_photos: (user.photos || []).length,
                height: user.height || businessConfig.defaults.minHeight,
                last_active_at: user.last_active_at,
                created_at: user.created_at,
                suspended_at: user.suspended_at,
                email_verified_at: user.email_verified_at,
                date_of_birth: user.date_of_birth,
                marital_status: user.marital_status,
                body_type: user.body_type,
                seeking_num_of_photos: user.seeking_num_of_photos,
                seeking_min_height: user.seeking_min_height,
                seeking_max_height: user.seeking_max_height,
                seeking_min_age: user.seeking_min_age,
                seeking_max_age: user.seeking_max_age,
                seeking_max_distance: user.seeking_max_distance,
                blocked_user_ids: Array.from(blockedIds),
                gender: user.gender,
                smoking: user.smoking,
                drinking: user.drinking,
                wants_children: user.wants_children,
                education: user.education,
                has_children: user.has_children,
                country: user.country,
                location_name: user.location_name,
                location_coordinates: {
                    lat: user.latitude,
                    lon: user.longitude
                },
                ethnicities: user.ethnicities || [],
                religions: user.religions || [],
                languages: user.languages || [],
                interests: user.interests || [],
                seeking_genders: user.seeking_genders || [],
                ethnic_preferences: user.ethnic_preferences || [],
                religious_preferences: user.religious_preferences || [],
                education_preferences: user.education_preferences || [],
                body_type_preferences: user.body_type_preferences || [],
                has_children_preferences: user.has_children_preferences || [],
                wants_children_preferences: user.wants_children_preferences || [],
                interest_preferences: user.interest_preferences || [],
                language_preferences: user.language_preferences || [],
                seeking_countries: user.seeking_countries || [],
                marital_status_preferences: user.marital_status_preferences || [],
                drinking_preferences: user.drinking_preferences || [],
                smoking_preferences: user.smoking_preferences || [],
            },
            {
                headers: getElasticSearchRequestHeaders(),
                httpsAgent
            }
        );

        return indexResponse.status >= 200 && indexResponse.status < 300;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            logError(
                new Error(`An error occurred while indexing user ${user.id} : ${user.email}.`),
                JSON.stringify(error.response.data)
            );
        } else {
            logError(
                new Error(`An error occurred while indexing user ${user.id} : ${user.email}.`),
                String(error)
            );
        }
        return false;
    }
}

/**
 * Searches users based on parameters.
 * @param currentUser
 * @param params
 */
export async function searchUsers(currentUser: Pick<User, 'id' | 'location_viewport' | 'country' | 'seeking_max_distance' | 'gender'>, params: SearchParameters) {
    const usersIndex = process.env.ELASTICSEARCH_USER_INDEX;
    const elasticSearchRoot = process.env.ELASTICSEARCH_BASE_URL;
    const pageSize = 60;

    const {
        page,
        seeking_min_height,
        seeking_max_height,
        seeking_max_age,
        seeking_min_age,
        seeking_max_distance,
        seeking_distance_origin,
        search_from_location,
        seeking_genders,
        sort_by
    } = params;

    const offset = ((page || 1) - 1) * pageSize;
    const minDateOfBirth = moment().subtract(seeking_max_age || businessConfig.defaults.maxAge, 'years');
    const maxDateOfBirth = moment().subtract(seeking_min_age || businessConfig.defaults.minAge, 'years');
    let locationSearchClause;
    let countrySearchClause;

    // Handle geo-bounding box queries
    if ((seeking_distance_origin === SearchFromOrigin.CurrentLocation && currentUser.location_viewport) ||
        seeking_distance_origin === SearchFromOrigin.SingleLocation && search_from_location?.viewport) {
        let viewport = seeking_distance_origin === SearchFromOrigin.CurrentLocation ? currentUser.location_viewport : search_from_location?.viewport;

        const country = seeking_distance_origin === SearchFromOrigin.CurrentLocation ?
            currentUser.country : _.first(search_from_location?.search_countries || []);

        if (viewport) {
            viewport = expandViewport(viewport, seeking_max_distance || currentUser.seeking_max_distance);
            locationSearchClause = {
                geo_bounding_box: {
                    location_coordinates: {
                        top_right: {
                            lat: viewport.high.latitude,
                            lon: viewport.high.longitude
                        },
                        bottom_left: {
                            lat: viewport.low.latitude,
                            lon: viewport.low.longitude
                        }
                    }
                }
            };

            if (country) {
                countrySearchClause = {
                    term: { country }
                };
            }
        }
    }

    // Handle multiple countries search
    if (seeking_distance_origin === SearchFromOrigin.MultipleCountries && search_from_location?.search_countries) {
        countrySearchClause = {
            terms: {
                country: search_from_location.search_countries
            }
        }
    }

    // Handle other preferences
    const filterClauses: any[] = [
        locationSearchClause,
        countrySearchClause,
        {
            terms: {
                gender: seeking_genders
            }
        },
        {
            term: {
                seeking_genders: currentUser.gender
            }
        },
        {
            range: {
                date_of_birth: {
                    gte: minDateOfBirth.format('YYYY-MM-DD'),
                    lte: maxDateOfBirth.format('YYYY-MM-DD')
                }
            }
        },
        {
            range: {
                height: {
                    gte: seeking_min_height || businessConfig.defaults.minHeight,
                    lte: seeking_max_height || businessConfig.defaults.maxHeight
                }
            }
        },
        {
            range: {
                number_of_photos: {
                    gte: params.number_of_photos || businessConfig.defaults.numOfPhotos,
                }
            }
        },
        {
            bool: {
                must_not: {
                    exists: {
                        field: 'suspended_at'
                    }
                }
            }
        },
        {
            bool: {
                must_not: {
                    term: {
                        id: Number(currentUser.id)
                    }
                }
            }
        },
        {
            bool: {
                should: [
                    {
                        bool: {
                            must_not: {
                                term: {
                                    blocked_user_id: Number(currentUser.id)
                                }
                            }
                        }
                    },
                    {
                        terms: {
                            blocked_user_ids: []
                        }
                    },
                    {
                        bool: {
                            must_not: {
                                exists: {
                                    field: 'blocked_user_ids'
                                }
                            }
                        }
                    }
                ],
                minimum_should_match: 1
            }
        }
    ];

    const termsQueryLabels = [
        "ethnicities",
        "religions",
        "languages",
        "interests",
        "marital_status",
        "body_type",
        "has_children",
        "wants_children",
        "education",
        "smoking",
        "drinking",
        "seeking_countries"
    ];

    // Fill in other terms queries
    for (const termsQueryLabel of termsQueryLabels) {
        const value = _.get(currentUser, termsQueryLabel);
        if (Array.isArray(value) && value.length > 0) {
            filterClauses.push({
                terms: {
                    [termsQueryLabel]: value
                }
            });
        }
    }

    // Find sorting parameter
    let sortByParam: any = {
        last_active_at: {
            order: 'desc'
        }
    };

    switch (sort_by) {
        case SearchSortBy.Newest: {
            sortByParam = {
                created_at: {
                    order: 'desc'
                }
            };
            break;
        }

        case SearchSortBy.Age: {
            sortByParam = {
                date_of_birth: {
                    order: 'desc'
                }
            };
            break;
        }

        case SearchSortBy.NumberOfPhotos: {
            sortByParam = {
                num_of_photos: {
                    order: 'desc'
                }
            };
            break;
        }
    }

    try {
        const response = await axios({
            method: 'get',
            url: `${elasticSearchRoot}/${usersIndex}/_search`,
            data: {
                from: offset,
                size: pageSize,
                sort: sortByParam,
                query: {
                    bool: {
                        filter: filterClauses
                    }
                }
            },
            headers: getElasticSearchRequestHeaders(),
            httpsAgent
        });

        const content = response.data;
        const totalCount: number = _.get(content, ['hits', 'total', 'value'], 0);
        const searchResults: UserPreview[] = _.get(content, ['hits', 'hits'], [])
            .map((hit: {_source: UserSearchDoc}) => translateToUserPreview(hit._source));

        // Hydrate results with match and blocked user data
        const currentUserId = Number(currentUser.id);
        if (searchResults.length > 0) {
            const userIds = searchResults.map(r => r.id).join(',');
            const allMatchBlockedUsers = transformBigInts<any[]>(await prisma.$queryRaw`
                 WITH cte_matches AS (
                SELECT IF(user_id = ${currentUserId}, recipient_id, user_id) as user_id,
                       M.status as match_status,
                       M.accepted_at as match_accepted_at,
                       M.id as match_id,
                       NULL as blocked_them,
                       NULL as they_blocked_me,
                       'match' as type
                FROM user_matches M
                WHERE (M.user_id = ${currentUserId} AND M.recipient_id IN (${userIds}))
                   OR (M.user_id IN (${userIds}) AND M.recipient_id = ${currentUserId} AND M.status != 'pending')
            ),
            cte_blocked_users AS (
                SELECT IF(user_id = ${currentUserId}, blocked_user_id, user_id) as user_id,
                       NULL as match_status,
                       NULL as match_accepted_at,
                       NULL as match_id,
                       user_id = ${currentUserId} as blocked_them,
                       user_id != ${currentUserId} as they_blocked_me,
                       'block' as type
                FROM blocked_users BU
                WHERE (user_id IN (${userIds}) OR user_id = ${currentUserId})
                  OR (blocked_user_id IN (${userIds}) OR blocked_user_id = ${currentUserId})
            )
            SELECT * FROM cte_matches
            UNION ALL
            SELECT * FROM cte_blocked_users`);

            if (allMatchBlockedUsers) {
                for (let i = 0; i < searchResults.length; i++) {
                    const searchResult = searchResults[i];
                    const selectedMatchBlockedUsers = allMatchBlockedUsers.filter(q => Number(q.user_id) === searchResult.id);
                    if (selectedMatchBlockedUsers.length > 0) {
                        for (const selectedMatchBlockedUser of selectedMatchBlockedUsers) {
                            if (selectedMatchBlockedUser.type === 'block') {
                                searchResult.they_blocked_me = Boolean(selectedMatchBlockedUser.they_blocked_me);
                                searchResult.i_blocked_them = Boolean(selectedMatchBlockedUser.blocked_them);
                            } else {
                                searchResult.match_id = +selectedMatchBlockedUser.match_id;
                                searchResult.match_status = selectedMatchBlockedUser.match_status;
                                searchResult.match_accepted_at = selectedMatchBlockedUser.match_accepted_at;
                            }
                        }
                    }
                }
            }
        }

        return { searchResults, totalCount, pageCount: Math.ceil(totalCount / pageSize) };
    } catch (err: any) {
        logError(err);
        return undefined;
    }
}

/**
 * Creates a user search index.
 */
export async function createUserSearchIndex() {
    const usersIndex = process.env.ELASTICSEARCH_USER_INDEX;
    const elasticSearchRoot = process.env.ELASTICSEARCH_BASE_URL;

    try {
        // Delete existing index
        try {
            await axios.delete(`${elasticSearchRoot}/${usersIndex}`, {
                headers: getElasticSearchRequestHeaders(),
                httpsAgent
            });
        } catch (error) {
            // Ignore error if index doesn't exist
            console.log(`Index ${usersIndex} might not exist yet or could not be deleted.`);
        }

        await axios.put(`${elasticSearchRoot}/${usersIndex}`, {
            settings: {
                index: {
                    number_of_shards: process.env.ELASTICSEARCH_SHARD_COUNT,
                    number_of_replicas: process.env.ELASTICSEARCH_REPLICA_COUNT
                }
            },
            mappings: {
                properties: {
                    id: {type: 'integer'},
                    display_name: {type: 'text', index: false},
                    first_name: {type: 'text', index: false},
                    last_name: {type: 'text', index: false},
                    main_photo: {type: 'keyword', index: false},
                    photos: {
                        properties: {
                            path: {type: 'keyword', index: false},
                            is_hidden: {type: 'boolean'},
                            caption: {type: 'text', index: false},
                            sort_order: {type: 'integer'},
                            uploaded_at: {
                                type: 'text',
                                fields: {
                                    keyword: {
                                        type: 'keyword',
                                        ignore_above: 256
                                    }
                                }
                            },
                            cropped_image_data: {
                                properties: {
                                    crop_position: {
                                        properties: {
                                            x1: {type: 'float', store: true},
                                            x2: {type: 'float', store: true},
                                            y1: {type: 'float', store: true},
                                            y2: {type: 'float', store: true}
                                        }
                                    },
                                    cropped_image_path: {type: 'keyword', store: true},
                                    height: {type: 'integer', store: true},
                                    width: {type: 'integer', store: true},
                                    image_position: {
                                        properties: {
                                            x1: {type: 'integer', store: true},
                                            x2: {type: 'integer', store: true},
                                            y1: {type: 'integer', store: true},
                                            y2: {type: 'integer', store: true}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    num_of_photos: {type: 'integer'},
                    height: {type: 'integer'},
                    last_active_at: {type: 'date'},
                    created_at: {type: 'date'},
                    suspended_at: {type: 'date'},
                    email_verified_at: {type: 'date'},
                    date_of_birth: {type: 'date'},
                    marital_status: {type: 'keyword'},
                    body_type: {type: 'keyword'},
                    seeking_num_of_photos: {type: 'integer'},
                    seeking_min_height: {type: 'integer'},
                    seeking_max_height: {type: 'integer'},
                    seeking_min_age: {type: 'integer'},
                    seeking_max_age: {type: 'integer'},
                    seeking_max_distance: {type: 'integer'},
                    ethnicities: {type: 'keyword'},
                    religions: {type: 'keyword', store: true},
                    languages: {type: 'keyword', store: true},
                    interests: {type: 'keyword', store: true},
                    blocked_user_ids: {type: 'integer', store: true},
                    ethnic_preferences: {type: 'keyword'},
                    religious_preferences: {type: 'keyword'},
                    education_preferences: {type: 'keyword'},
                    body_type_preferences: {type: 'keyword'},
                    has_children_preferences: {type: 'keyword'},
                    wants_children_preferences: {type: 'keyword'},
                    interest_preferences: {type: 'keyword'},
                    language_preferences: {type: 'keyword'},
                    seeking_countries: {type: 'keyword'},
                    marital_status_preferences: {type: 'keyword'},
                    drinking_preferences: {type: 'keyword'},
                    smoking_preferences: {type: 'keyword'},
                    seeking_genders: {type: 'keyword'},
                    gender: {type: 'keyword'},
                    smoking: {type: 'keyword'},
                    drinking: {type: 'keyword'},
                    wants_children: {type: 'keyword'},
                    education: {type: 'keyword'},
                    has_children: {type: 'keyword'},
                    location_coordinates: {type: 'geo_point'},
                    country: {type: 'keyword'},
                    location_name: {type: 'text', index: false}
                }
            }
        },
            {
                headers: getElasticSearchRequestHeaders(),
                httpsAgent
            }
        );

        console.log(`Index ${usersIndex} was successfully created!`);
        return true;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error(`An error occurred while creating the index. Status: ${error.response.status} : ${error.response.statusText}`);
            console.error(error.response.data);
        } else {
            console.error(`An error occurred while creating the index:`, String(error));
        }
        return false;
    }
}

/**
 * Generates the request headers needed to make requests to Elasticsearch.
 */
function getElasticSearchRequestHeaders() {
    return {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Basic ${Buffer.from(`${process.env.ELASTICSEARCH_USERNAME}:${process.env.ELASTICSEARCH_PASSWORD}`).toString('base64')}`
    };
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
 * Translate source to user preview.
 * @param source
 */
function translateToUserPreview(source: UserSearchDoc): UserPreview {
    return {
        photos: (source.photos || []).map(photo => appendMediaRootToImage(photo)),
        public_main_photo: appendMediaRootToImageUrl(source.main_photo),
        num_of_photos: source.number_of_photos,
        main_photo_cropped_image_data: getMainCroppedImageData(source),
        main_photo: source.main_photo,
        date_of_birth: new Date(source.date_of_birth),
        age: calculateUserAge(source),
        latitude: source.location_coordinates.lat,
        longitude: source.location_coordinates.lon,
        last_active_at: source.last_active_at ? new Date(source.last_active_at) : undefined,
        created_at: source.created_at ? new Date(source.created_at) : undefined,
        ..._.pick(source, ['id', 'display_name', 'main_photo', 'gender', 'location_name', 'country'])
    }
}

