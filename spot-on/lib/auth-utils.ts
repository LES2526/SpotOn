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
export function isEmailAllowed(email: string | null | undefined): boolean {
    const normalizedEmail = email?.toLowerCase();
    if (!normalizedEmail) {
        return false;
    }
    return normalizedEmail.endsWith(`@${process.env.ALLOWED_EMAIL_DOMAIN}`);
}
