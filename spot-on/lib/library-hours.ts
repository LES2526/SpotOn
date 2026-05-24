export function isBypassHoursEnabled(): boolean {
    return process.env.BYPASS_HOURS_CHECK === 'true';
}

/**
 * Clamps the expected end time to the library's closing time if it exceeds it.
 * @param expectedEndTime
 * @returns Date object representing the adjusted end time, which will not be later than the library's closing time.
 */
export function clampToClosingTime(expectedEndTime: Date): Date {
    if (isBypassHoursEnabled()) return expectedEndTime;

    const [hours, minutes] = process.env.LIBRARY_CLOSING_TIME?.split(':').map(Number) || [19, 30];
    const closingTime = new Date();
    closingTime.setUTCHours(hours, minutes, 0, 0);

    if (expectedEndTime > closingTime) {
        return closingTime;
    }

    return expectedEndTime;
}

/** Returns true if the given date's UTC time is past the library closing time. */
export function isAfterHours(date: Date): boolean {
    if (isBypassHoursEnabled()) return false;

    const [closingHours, closingMinutes] = process.env.LIBRARY_CLOSING_TIME?.split(':').map(Number) || [19, 30];

    const dateHours = date.getUTCHours();
    const dateMinutes = date.getUTCMinutes();

    return dateHours * 60 + dateMinutes > closingHours * 60 + closingMinutes;
}
