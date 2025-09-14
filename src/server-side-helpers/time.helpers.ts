/**
 * Returns a human-readable difference between the given date and now.
 * Example outputs: "4 seconds ago", "5 minutes ago", "4 hours ago", "in 2 days"
 *
 * @param date The date to compare with the current date. Can be a Date object or a string.
 * @returns A string representing the time difference.
 */
/**
 * Checks if a given date is today.
 * @param date The date to check
 * @returns boolean indicating if the date is today
 */
export function isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return dateObj.getDate() === today.getDate() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getFullYear() === today.getFullYear();
}

/**
 * Formats a date in the format "Monday, June 24, 2025"
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatChatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function humanizeTimeDiff(date?: Date | string): string {
    if (!date)
        return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    const utcDate = new Date(dateObj.getTime());
    const utcNow = new Date(now.getTime());

    // Calculate difference in seconds
    const diffInSeconds = Math.floor((utcNow.getTime() - utcDate.getTime()) / 1000);

    // If exactly now, return 'just now'
    if (diffInSeconds === 0) {
        return "Just now";
    }

    const isPast = diffInSeconds > 0;
    const diff = Math.abs(diffInSeconds);

    // Define time units in seconds (approximate for months and years)
    const units: { [key: string]: number } = {
        year: 31536000,   // 365 days
        month: 2592000,   // 30 days
        day: 86400,       // 24 hours
        hour: 3600,       // 60 minutes
        minute: 60,       // 60 seconds
        second: 1
    };

    // Find the largest unit that fits the difference
    for (const unit in units) {
        const unitSeconds = units[unit];
        if (diff >= unitSeconds) {
            const value = Math.floor(diff / unitSeconds);
            const unitLabel = value === 1 ? unit : `${unit}s`;
            return isPast ? `${value} ${unitLabel} ago` : `in ${value} ${unitLabel}`;
        }
    }

    return "Just now";
}
