import ConsoleCommand from "./console.command";
import { Command } from "commander";
import { faker } from '@faker-js/faker';
import { businessConfig } from "@/config/business";
import { pgDbReadPool, pgDbWritePool } from "@/lib/postgres";
import bcrypt from 'bcryptjs';
import { SearchFromOrigin } from "@/types/user.interface";

interface CachedLocation {
    id: number;
    formattedName: string;
    area: string | null;
    city: string;
    region: string | null;
    country: string | null;
    googlePlaceId: string;
    latitude: number;
    longitude: number;
    viewport: any;
}

export default class SeedUsersCommand extends ConsoleCommand {
    constructor() {
        super('users:seed', 'Create random users for testing and development', [
            {
                option: '-n, --num-of-users <number>',
                description: 'Number of users to create (default: 10)',
                required: false
            }
        ]);
    }

    async handle(prog: Command): Promise<number> {
        const options = prog.opts();
        const numOfUsers = parseInt(options.numOfUsers) || 10;

        console.log(`Starting user seeding process...`);
        console.log(`Target number of users to create: ${numOfUsers}`);

        try {
            // Fetch cached locations
            const locationsResult = await pgDbReadPool.query('SELECT * FROM "cachedLocations"');
            const cachedLocations: CachedLocation[] = locationsResult.rows;

            if (cachedLocations.length === 0) {
                console.error('No cached locations found. Please ensure locations are seeded first.');
                return 1;
            }

            console.log(`Found ${cachedLocations.length} cached locations to choose from.`);

            // Hash the default password once
            const hashedPassword = await bcrypt.hash('Password1!', 10);

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < numOfUsers; i++) {
                try {
                    const userData = await this.generateRandomUser(cachedLocations, hashedPassword);
                    await this.insertUser(userData);
                    successCount++;

                    if ((i + 1) % 10 === 0) {
                        console.log(`Progress: ${i + 1}/${numOfUsers} users created...`);
                    }
                } catch (error) {
                    // Only log the error if it's not a duplicate key error
                    if (!(error as Error).message.includes('duplicate key value violates unique constraint')) {
                        console.error(`Error creating user ${i + 1}:`, error);
                    }

                    failCount++;
                }
            }

            console.log(`User seeding complete!`);
            console.log(`Successfully created: ${successCount} users`);
            console.log(`Failed: ${failCount} users`);

            return failCount > 0 ? 1 : 0;
        } catch (error) {
            console.error('Error during user seeding:', error);
            return 1;
        }
    }

    private async generateRandomUser(cachedLocations: CachedLocation[], hashedPassword: string) {
        // Basic user info
        const gender = faker.helpers.arrayElement(['male', 'female']);
        const firstName = faker.person.firstName(gender);
        const lastName = faker.person.lastName();
        const displayName = faker.internet.displayName({ firstName, lastName });
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();

        // Age and date of birth (18-75 years old)
        const age = faker.number.int({ min: 18, max: 75 });
        const dateOfBirth = faker.date.birthdate({ min: age, max: age, mode: 'age' });

        // Bio (max 10 sentences)
        const bioSentences = faker.number.int({ min: 3, max: 10 });
        const bio = faker.lorem.sentences(bioSentences);

        // Height in cm
        const height = faker.number.int({ min: businessConfig.defaults.minHeight, max: businessConfig.defaults.maxHeight });

        // Location data
        const randomLocation = faker.helpers.arrayElement(cachedLocations);

        // Profile attributes from business config
        const bodyType = faker.helpers.arrayElement(Object.keys(businessConfig.options.bodyTypes));
        const maritalStatus = faker.helpers.arrayElement(Object.keys(businessConfig.options.maritalStatuses));
        const smoking = faker.helpers.arrayElement(Object.keys(businessConfig.options.smokingStatuses));
        const drinking = faker.helpers.arrayElement(Object.keys(businessConfig.options.drinkingStatuses));
        const education = faker.helpers.arrayElement(Object.keys(businessConfig.options.educationLevels));
        const hasChildren = faker.helpers.arrayElement(Object.keys(businessConfig.options.hasChildrenStatuses));
        const wantsChildren = faker.helpers.arrayElement(Object.keys(businessConfig.options.wantsChildrenStatuses));

        // Arrays for cultural background (JSONB)
        const religionKeys = Object.keys(businessConfig.options.religions);
        const religions = faker.helpers.arrayElements(religionKeys, { min: 1, max: 2 });

        const languageKeys = Object.keys(businessConfig.options.languages);
        const languages = faker.helpers.arrayElements(languageKeys, { min: 1, max: 5 });

        const interestKeys = Object.keys(businessConfig.options.interests);
        const interests = faker.helpers.arrayElements(interestKeys, { min: 1, max: 8 });

        const ethnicityKeys = Object.keys(businessConfig.options.ethnicities);
        const ethnicities = faker.helpers.arrayElements(ethnicityKeys, { min: 1, max: 3 });

        // Photo generation
        const photoCount = faker.number.int({ min: 3, max: 8 });
        const photoNumbers = faker.helpers.arrayElements(
            Array.from({ length: 78 }, (_, i) => i + 1), // Create array [1, 2, 3, ..., 78]
            { min: photoCount, max: photoCount }
        );

        const photos = photoNumbers.map((num, index) => ({
            path: `random_images/${num}.jpg`,
            caption: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : null,
            isHidden: 0,
            sortOrder: index + 1,
            uploadedAt: faker.date.recent({ days: 365 }).toISOString().slice(0, 19).replace('T', ' ')
        }));

        const mainPhoto = photos.length > 0 ? photos[0].path : null;
        const numOfPhotos = photos.length;

        // Seeking preferences
        const seekingGender = faker.helpers.arrayElement(['male', 'female']);
        const seekingMinAge = faker.number.int({ min: 18, max: 65 });
        const seekingMaxAge = faker.number.int({ min: seekingMinAge, max: 75 });

        const heightKeys = Object.keys(businessConfig.options.height).map(h => parseInt(h));
        const seekingMinHeight = faker.helpers.arrayElement(heightKeys);
        const seekingMaxHeight = faker.helpers.arrayElement(heightKeys.filter(h => h >= seekingMinHeight));

        const seekingNumOfPhotos = faker.number.int({ min: 3, max: 10 });
        const seekingMaxDistance = faker.helpers.arrayElement(Object.keys(businessConfig.options.distance).map(d => parseInt(d)));

        // Preference arrays (JSONB) - using similar logic but for preferences
        const ethnicPreferences = faker.helpers.arrayElements(ethnicityKeys, { min: 0, max: 5 });
        const religiousPreferences = faker.helpers.arrayElements(religionKeys, { min: 0, max: 4 });
        const languagePreferences = faker.helpers.arrayElements(languageKeys, { min: 0, max: 5 });
        const interestPreferences = faker.helpers.arrayElements(interestKeys, { min: 0, max: 8 });
        const educationPreferences = faker.helpers.arrayElements(Object.keys(businessConfig.options.educationLevels), { min: 0, max: 3 });
        const bodyTypePreferences = faker.helpers.arrayElements(Object.keys(businessConfig.options.bodyTypes), { min: 0, max: 3 });
        const maritalStatusPreferences = faker.helpers.arrayElements(Object.keys(businessConfig.options.maritalStatuses), { min: 0, max: 3 });
        const smokingPreferences = faker.helpers.arrayElements(Object.keys(businessConfig.options.smokingStatuses), { min: 0, max: 3 });
        const drinkingPreferences = faker.helpers.arrayElements(Object.keys(businessConfig.options.drinkingStatuses), { min: 0, max: 3 });
        const hasChildrenPreferences = faker.helpers.arrayElements(Object.keys(businessConfig.options.hasChildrenStatuses), { min: 0, max: 3 });
        const wantsChildrenPreferences = faker.helpers.arrayElements(Object.keys(businessConfig.options.wantsChildrenStatuses), { min: 0, max: 3 });

        // Timestamps
        const now = new Date();
        const lastActiveAt = faker.date.recent({ days: 730 }); // Up to 2 years ago

        return {
            displayName,
            firstName,
            lastName,
            email,
            password: hashedPassword,
            refreshToken: null,
            gender,
            dateOfBirth,
            bio,
            height,
            bodyType,
            maritalStatus,
            smoking,
            drinking,
            education,
            hasChildren,
            wantsChildren,
            religions: JSON.stringify(religions),
            languages: JSON.stringify(languages),
            interests: JSON.stringify(interests),
            ethnicities: JSON.stringify(ethnicities),
            country: randomLocation.country,
            locationName: randomLocation.formattedName,
            locationViewport: randomLocation.viewport,
            latitude: randomLocation.latitude,
            longitude: randomLocation.longitude,
            seekingGender,
            seekingMinAge,
            seekingMaxAge,
            seekingMinHeight,
            seekingMaxHeight,
            seekingNumOfPhotos,
            seekingMaxDistance,
            seekingDistanceOrigin: SearchFromOrigin.CurrentLocation,
            seekingCountries: null,
            singleSearchLocation: null,
            ethnicPreferences: JSON.stringify(ethnicPreferences),
            religiousPreferences: JSON.stringify(religiousPreferences),
            languagePreferences: JSON.stringify(languagePreferences),
            interestPreferences: JSON.stringify(interestPreferences),
            educationPreferences: JSON.stringify(educationPreferences),
            bodyTypePreferences: JSON.stringify(bodyTypePreferences),
            maritalStatusPreferences: JSON.stringify(maritalStatusPreferences),
            smokingPreferences: JSON.stringify(smokingPreferences),
            drinkingPreferences: JSON.stringify(drinkingPreferences),
            hasChildrenPreferences: JSON.stringify(hasChildrenPreferences),
            wantsChildrenPreferences: JSON.stringify(wantsChildrenPreferences),
            photos: JSON.stringify(photos),
            mainPhoto,
            numOfPhotos,
            paymentProfileId: null,
            customerPaymentProfileId: null,
            timezone: 'UTC',
            createdAt: now,
            updatedAt: now,
            lastActiveAt,
            suspendedAt: null,
            suspendedReason: null,
            emailVerifiedAt: null,
            isUnderReview: 0,
            deactivatedAt: null
        };
    }

    private async insertUser(userData: any): Promise<void> {
        const query = `
            INSERT INTO "users" (
                "displayName", "firstName", "lastName", "email", "password", "refreshToken",
                "gender", "dateOfBirth", "bio", "height", "bodyType", "maritalStatus",
                "smoking", "drinking", "education", "hasChildren", "wantsChildren",
                "religions", "languages", "interests", "ethnicities",
                "country", "locationName", "locationViewport", "latitude", "longitude",
                "geoPoint", "seekingGender", "seekingMinAge", "seekingMaxAge",
                "seekingMinHeight", "seekingMaxHeight", "seekingNumOfPhotos", "seekingMaxDistance",
                "seekingDistanceOrigin", "seekingCountries", "singleSearchLocation",
                "ethnicPreferences", "religiousPreferences", "languagePreferences",
                "interestPreferences", "educationPreferences", "bodyTypePreferences",
                "maritalStatusPreferences", "smokingPreferences", "drinkingPreferences",
                "hasChildrenPreferences", "wantsChildrenPreferences",
                "photos", "mainPhoto", "numOfPhotos", "paymentProfileId", "customerPaymentProfileId",
                "timezone", "createdAt", "updatedAt", "lastActiveAt", "suspendedAt",
                "suspendedReason", "emailVerifiedAt", "isUnderReview", "deactivatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22, $23, $24, $25, $26,
                ST_SetSRID(ST_MakePoint($27, $28), 4326),
                $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43,
                $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58,
                $59, $60, $61, $62, $63
            )
        `;

        const values = [
            userData.displayName, userData.firstName, userData.lastName, userData.email,
            userData.password, userData.refreshToken, userData.gender, userData.dateOfBirth,
            userData.bio, userData.height, userData.bodyType, userData.maritalStatus,
            userData.smoking, userData.drinking, userData.education, userData.hasChildren,
            userData.wantsChildren, userData.religions, userData.languages, userData.interests,
            userData.ethnicities, userData.country, userData.locationName, userData.locationViewport,
            userData.latitude, userData.longitude, userData.longitude, userData.latitude, // For ST_MakePoint (lon, lat)
            userData.seekingGender, userData.seekingMinAge, userData.seekingMaxAge,
            userData.seekingMinHeight, userData.seekingMaxHeight, userData.seekingNumOfPhotos,
            userData.seekingMaxDistance, userData.seekingDistanceOrigin, userData.seekingCountries,
            userData.singleSearchLocation, userData.ethnicPreferences, userData.religiousPreferences,
            userData.languagePreferences, userData.interestPreferences, userData.educationPreferences,
            userData.bodyTypePreferences, userData.maritalStatusPreferences, userData.smokingPreferences,
            userData.drinkingPreferences, userData.hasChildrenPreferences, userData.wantsChildrenPreferences,
            userData.photos, userData.mainPhoto, userData.numOfPhotos, userData.paymentProfileId,
            userData.customerPaymentProfileId, userData.timezone, userData.createdAt,
            userData.updatedAt, userData.lastActiveAt, userData.suspendedAt, userData.suspendedReason,
            userData.emailVerifiedAt, userData.isUnderReview, userData.deactivatedAt
        ];

        await pgDbWritePool.query(query, values);
    }
} 