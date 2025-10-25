export const businessConfig = {
    defaults: {
        numOfPhotos: 3,
        maxDistance: 500,
        minHeight: 140,
        maxHeight: 219,
        minAge: 18,
        maxAge: 99,
        maritalStatus: 'single',
    },

    search: {
        maxResultWindow: 50000,
        pageSize: 180
    },

    options: {
        numberOfPhotos: {
            3: '3+',
            4: '4+',
            5: '5+',
            6: '6+',
            7: '7+',
            8: '8+'
        },

        bodyTypes: {
            slim: 'Slim',
            athletic: 'Athletic',
            average: 'Average',
            curvy: 'Curvy',
            heavyset: 'Heavyset'
        },

        searchFromLocationTypes: {
            all: 'All Locations',
            currentLocation: 'Current Location',
            singleLocation: 'Single Location',
            multipleCountries: 'Multiple Countries'
        },

        religions: {
            christianProtestant: 'Christianity (Protestant)',
            christianCatholic: 'Christianity (Catholic)',
            christianInc: 'Iglesia Ni Christo',
            christianOther: 'Christianity (Other)',
            mormon: 'Mormonism (LDS)',
            bahai: 'Bahá’í',
            judaism: 'Judaism',
            sikhism: 'Sikhism',
            noReligion: 'No Religion',
            atheist: 'Atheist',
            agnostic: 'Agnostic',
            spiritual: 'Spiritual',
            islam: 'Islam',
            hinduism: 'Hinduism',
            buddhism: 'Buddhism',
            other: 'Other'
        },

        languages: {
            english: 'English',
            filipino: 'Filipino',
            cebuano: 'Cebuano',
            spanish: 'Spanish',
            french: 'French',
            german: 'German',
            japanese: 'Japanese',
            korean: 'Korean',
            portuguese: 'Portuguese',
            mandarin: 'Mandarin Chinese',
            cantonese: 'Cantonese',
            arabic: 'Arabic',
            hindi: 'Hindi',
            bengali: 'Bengali',
            russian: 'Russian',
            italian: 'Italian',
            dutch: 'Dutch',
            swedish: 'Swedish',
            norwegian: 'Norwegian',
            danish: 'Danish',
            finnish: 'Finnish',
            polish: 'Polish',
            czech: 'Czech',
            hungarian: 'Hungarian',
            romanian: 'Romanian',
            bulgarian: 'Bulgarian',
            greek: 'Greek',
            turkish: 'Turkish',
            hebrew: 'Hebrew',
            persian: 'Persian (Farsi)',
            urdu: 'Urdu',
            punjabi: 'Punjabi',
            tamil: 'Tamil',
            telugu: 'Telugu',
            marathi: 'Marathi',
            gujarati: 'Gujarati',
            kannada: 'Kannada',
            malayalam: 'Malayalam',
            thai: 'Thai',
            vietnamese: 'Vietnamese',
            indonesian: 'Indonesian',
            malay: 'Malay',
            tagalog: 'Tagalog',
            other: 'Other'
        },

        smokingStatuses: {
            no: 'No',
            occasionally: 'Occasionally',
            regularly: 'Regularly'
        },

        drinkingStatuses: {
            no: 'No',
            socially: 'Socially',
            regularly: 'Regularly'
        },

        ethnicities: {
            caucasian: 'Caucasian',
            asian: 'Asian',
            southAsian: 'South Asian',
            black: 'Black/African Decent',
            hispanic: 'Hispanic',
            latino: 'Latino',
            middleEastern: 'Middle Eastern',
            pacificIslander: 'Pacific Islander',
            nativeAmerican: 'Native American',
            northAfrican: 'North African',
            other: 'Other'
        },

        eyeColors: {
            brown: 'Brown',
            blue: 'Blue',
            green: 'Green',
            hazel: 'Hazel',
            grey: 'Grey',
            black: 'Black'
        },

        educationLevels: {
            highSchool: 'High School',
            someCollege: 'Some College',
            associatesDegree: "Associate's Degree",
            bachelorsDegree: "Bachelor's Degree",
            mastersDegree: "Master's Degree",
            doctorate: 'Doctorate',
            vocationalSchool: 'Vocational School'
        },

        hairColors: {
            brown: 'Brown',
            black: 'Black',
            blonde: 'Blonde',
            red: 'Red',
            white: 'White',
            other: 'Other'
        },

        maritalStatuses: {
            single: 'Single',
            divorced: 'Divorced',
            widowed: 'Widowed',
            separated: 'Separated',
            married: 'Married',
            annulled: 'Annulled'
        },

        hasChildrenStatuses: {
            no: 'No',
            yesAtHome: 'Yes (At Home)',
            yesAway: 'Yes (Away)'
        },

        wantsChildrenStatuses: {
            yes: 'Yes',
            no: 'No',
            notSure: 'Not Sure'
        },

        seekingDistanceOrigin: {
            currentLocation: 'Current Location',
            singleLocation: 'Single Location',
            multipleCountries: 'Multiple Countries'
        },

        interests: {
            basketball: { label: 'Basketball', emoji: '🏀' },
            boardGames: { label: 'Board Games', emoji: '🎲' },
            camping: { label: 'Camping', emoji: '🏕️' },
            cardGames: { label: 'Card Games', emoji: '🃏' },
            cars: { label: 'Cars', emoji: '🚗' },
            collecting: { label: 'Collecting', emoji: '🧩' },
            cooking: { label: 'Cooking', emoji: '🍳' },
            crafting: { label: 'Crafting', emoji: '🧶' },
            dancing: { label: 'Dancing', emoji: '💃' },
            fashion: { label: 'Fashion', emoji: '👗' },
            fishing: { label: 'Fishing', emoji: '🎣' },
            football: { label: 'Football', emoji: '🏈' },
            gaming: { label: 'Gaming', emoji: '🎮' },
            gardening: { label: 'Gardening', emoji: '🌻' },
            healthAndFitness: { label: 'Health and Fitness', emoji: '🏋️' },
            hiking: { label: 'Hiking', emoji: '🥾' },
            karaoke: { label: 'Karaoke', emoji: '🎤' },
            martialArts: { label: 'Martial Arts', emoji: '🥋' },
            movies: { label: 'Movies', emoji: '🎬' },
            music: { label: 'Music', emoji: '🎵' },
            meditation: { label: 'Meditation', emoji: '🧘' },
            painting: { label: 'Painting', emoji: '🎨' },
            photography: { label: 'Photography', emoji: '📸' },
            reading: { label: 'Reading', emoji: '📚' },
            running: { label: 'Running', emoji: '🏃' },
            singing: { label: 'Singing', emoji: '🎶' },
            skiing: { label: 'Skiing', emoji: '⛷️' },
            soccer: { label: 'Soccer', emoji: '⚽' },
            sports: { label: 'Sports', emoji: '🏅' },
            traveling: { label: 'Traveling', emoji: '✈️' },
            volleyball: { label: 'Volleyball', emoji: '🏐' },
            volunteering: { label: 'Volunteering', emoji: '🤝' },
            weightlifting: { label: 'Weightlifting', emoji: '🏋️' },
            writing: { label: 'Writing', emoji: '📝' },
            yoga: { label: 'Yoga', emoji: '🧘' }
        },

        distance: {
            100: '100 km (62 mi)',
            150: '150 km (93 mi)',
            200: '200 km (124 mi)',
            250: '250 km (155 mi)',
            300: '300 km (186 mi)',
            350: '350 km (217 mi)',
            400: '400 km (248 mi)',
            450: '450 km (279 mi)',
            500: '500 km (310 mi)'
        },

        height: {
            140: "4'7\"",
            143: "4'8\"",
            145: "4'9\"",
            148: "4'10\"",
            150: "4'11\"",
            153: "5'0\"",
            155: "5'1\"",
            158: "5'2\"",
            161: "5'3\"",
            163: "5'4\"",
            166: "5'5\"",
            168: "5'6\"",
            171: "5'7\"",
            173: "5'8\"",
            176: "5'9\"",
            178: "5'10\"",
            181: "5'11\"",
            183: "6'0\"",
            186: "6'1\"",
            188: "6'2\"",
            191: "6'3\"",
            194: "6'4\"",
            196: "6'5\"",
            199: "6'6\"",
            201: "6'7\"",
            204: "6'8\"",
            206: "6'9\"",
            209: "6'10\"",
            211: "6'11\"",
            214: "7'0\"",
            216: "7'1\"",
            219: "7'2\""
        },

        timezones: {
            'America/New_York': 'Eastern Standard Time (US)',
            'America/Chicago': 'Central Standard Time (US)',
        }
    },

    s3Buckets: [
        {
            bucketName: 'diwa-date-prod-sfo',
            region: 'sfo3',
            endpoint: 'https://sfo3.digitaloceanspaces.com'
        },
        {
            bucketName: 'diwa-date-prod-sgp',
            region: 'sgp1',
            endpoint: 'https://sgp1.digitaloceanspaces.com'
        }
    ],
}
