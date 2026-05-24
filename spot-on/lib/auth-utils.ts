/**
 * @fileoverview Authentication utility functions.
 *
 * Provides helper functions for email validation and authentication logic
 * that can be used independently of NextAuth configuration.
 *
 * @module lib/auth-utils
 *
 * @author Spot-On Team
 * @since 1.0.0
 */


/**
 * Checks if any email should be allowed for authentication in development mode.
 *
 * This function reads the ALLOW_ANY_EMAIL_IN_DEV environment variable to determine
 * if email domain restrictions should be bypassed during development. This is useful
 * for testing with non-institutional email addresses without modifying the allowed domain.
 *
 * @function
 * @returns {boolean} True if any email should be allowed in development, false otherwise
 */
export function shouldAllowAnyEmailInDevelopment(): boolean {
    return process.env.ALLOW_ANY_EMAIL_IN_DEV === "true";
}

/**
 * Validates if an email address belongs to the allowed domain.
 *
 * Performs case-insensitive validation against the configured allowed domain.
 * Returns false for null, undefined, or empty email addresses.
 *
 * The allowed domain is read from the ALLOWED_EMAIL_DOMAIN environment variable.
 *
 * @function
 * @param {string | null | undefined} email - The email address to validate
 * @returns {boolean} True if email ends with allowed domain, false otherwise
 *
 * @example
 * Valid email
 * isEmailAllowed("student@ualg.pt") // returns true
 * isEmailAllowed("STUDENT@UALG.PT") // returns true (case-insensitive)
 *
 * Invalid emails
 * isEmailAllowed("user@gmail.com") // returns false
 * isEmailAllowed("user@ualg.ptx") // returns false
 * isEmailAllowed(null) // returns false
 * isEmailAllowed("") // returns false
 *
 * @public
 * @since 1.0.0
 */
export function isEmailFromDomain(
    email: string | null | undefined,
    domain: string | null | undefined,
): boolean {
    if (!email || !domain) {
        return false;
    }
    const parts = email.toLowerCase().split("@");
    return parts.length === 2 && parts[1] === domain.toLowerCase();
}

export function isEmailAllowed(email: string | null | undefined)
    : boolean {
    const normalizedEmail = email?.toLowerCase();
    if (!normalizedEmail) {
        return false;
    }
    if (shouldAllowAnyEmailInDevelopment()) {
        return true;
    }
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    if (!allowedDomain) {
        return true;
    }
    return isEmailFromDomain(normalizedEmail, allowedDomain);
}

/**
    * Extracts the student ID from an email address if it follows the expected format.
    * The expected format is an email prefix that starts with 'a' followed by digits (e.g., "a123456").
    *
 * @param email - The email address to extract the student ID from
 * @returns The extracted student ID as a string, or null if the format is invalid
 *
 * @example
 * extractStudentId("a123456@ualg.pt") // returns "123456"
 * extractStudentId("user@ualg.pt") // returns null
 * extractStudentId(null) // returns null
 */
export function extractStudentId(email: string | null | undefined):
    string | null {
    const prefix = email?.split("@")[0];
    if (!prefix) {
        return null;
    }
    if (/^a\d+$/.test(prefix)) {
        return prefix.slice(1);
    }
    return null;
}
