import moment from "moment";

/**
 * Determines if a user is to be considered "online".
 * @param lastActiveAt
 * @param hideOnlineStatus
 */
export function isUserOnline(lastActiveAt: Date, hideOnlineStatus: boolean) {
    if (hideOnlineStatus) {
        return false;
    }

    const onlineThreshold = parseInt(process.env.ONLINE_LAST_ACTIVE_MIN || '5', 10);
    const lastActiveMoment = moment(lastActiveAt);
    const currentMoment = moment();
    const minutesDiff = currentMoment.diff(lastActiveMoment, 'minutes');

    return minutesDiff <= onlineThreshold;
}

/**
 * Create appropriate gender seeking label.
 * @param gender The gender string (e.g., 'male', 'female', 'both')
 * @returns string
 */
export function createGenderLabels(gender?: string): string {
    if (!gender) {
        return 'Not specified';
    }
    const lowerGender = gender.toLowerCase();
    if (lowerGender === 'male') {
        return 'Men';
    }
    if (lowerGender === 'female') {
        return 'Women';
    }
    if (lowerGender === 'both' || lowerGender === 'all' || lowerGender === 'men and women') { // Assuming 'both' or 'all' can represent this
        return 'Men and Women';
    }
    // Fallback: capitalize the provided gender string if it's something else
    return gender.charAt(0).toUpperCase() + gender.slice(1);
}
