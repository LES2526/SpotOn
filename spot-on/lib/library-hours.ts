
/**
 * Clamps the expected end time to the library's closing time if it exceeds it.
 * @param expectedEndTime 
 * @returns Date object representing the adjusted end time, which will not be later than the library's closing time.
 */
export function clampToClosingTime(expectedEndTime: Date): Date {
    const [hours, minutes] = process.env.LIBRARY_CLOSING_TIME?.split(':').map(Number) || [20, 30];
    const closingTime = new Date();
    closingTime.setHours(hours, minutes, 0, 0);

    if (expectedEndTime > closingTime) {
        return closingTime;
    }

    return expectedEndTime;
}

/**
 * Checks if the current time is past the library's closing time.
 * @returns boolean indicating if the current time is past the closing time.
 */
export function isPastClosingTime(): boolean {
    const [hours, minutes] = process.env.LIBRARY_CLOSING_TIME?.split(':').map(Number) || [20, 30];
    const closingTime = new Date();
    closingTime.setHours(hours, minutes, 0, 0);

    return new Date() > closingTime;
}

