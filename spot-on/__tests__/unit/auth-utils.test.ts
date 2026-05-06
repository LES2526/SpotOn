/**
 * @fileoverview Unit tests for NextAuth email authentication system.
 *
 * This test suite validates the email domain restriction logic that ensures
 * only users with @ualg.pt email addresses can authenticate in the application.
 *
 * @module __tests__/auth
 * @requires jest
 * @requires @testing-library/jest-dom
 *
 * @see {@link https://next-auth.js.org/|NextAuth.js Documentation}
 * @see {@link ../app/api/auth/[...nextauth]/route.ts|Authentication Route}
 *
 * @author Spot-On Team
 * @since 1.0.0
 */
import { extractStudentId, isEmailAllowed } from "@/lib/auth-utils";

/**
 * Test suite for email domain validation.
 *
 * Validates that the authentication system correctly:
 * - Accepts emails ending with @ualg.pt
 * - Rejects emails from other domains
 * - Handles edge cases (null, undefined, empty strings)
 * - Is case-insensitive
 */
describe("Email Domain Validation", () => {

    beforeAll(() => {
        process.env.ALLOW_ANY_EMAIL_IN_DEV = 'false';
    });

    /**
     * Test cases for valid @ualg.pt email addresses.
     *
     * Ensures that properly formatted institutional emails are accepted,
     * regardless of case sensitivity.
     */
    describe("Valid @ualg.pt emails", () => {
        /**
         *  Should accept a standard @ualg.pt email address.
         */
        it("should allow standard @ualg.pt email", () => {
            expect(isEmailAllowed("a12345@ualg.pt")).toBe(true);
        });

        /**
         * Should accept a standard lowercase @ualg.pt email.
         */
        it("should allow valid @ualg.pt email", () => {
            expect(isEmailAllowed("joao.silva@ualg.pt")).toBe(true);
        });

        /**
         * Should accept an all-uppercase @ualg.pt email.
         * Validates case-insensitive matching.
         */
        it("should allow @ualg.pt email with uppercase", () => {
            expect(isEmailAllowed("MARIA.SANTOS@UALG.PT")).toBe(true);
        });

        /**
         * Should accept a mixed-case @ualg.pt email.
         * Further validates case-insensitive matching.
         */
        it("should allow @ualg.pt email with mixed case", () => {
            expect(isEmailAllowed("Pedro.Costa@UAlg.Pt")).toBe(true);
        });
    });

    /**
     * Test cases for invalid email addresses.
     *
     * Ensures that non-institutional emails and malformed addresses
     * are properly rejected.
     */
    describe("Invalid emails", () => {
        /**
         * Should reject emails from gmail.com domain.
         */
        it("should reject @gmail.com email", () => {
            expect(isEmailAllowed("joao.silva@gmail.com")).toBe(false);
        });

        /**
         * Should reject emails from outlook.com domain.
         */
        it("should reject @outlook.com email", () => {
            expect(isEmailAllowed("maria@outlook.com")).toBe(false);
        });

        /**
         * Should reject malformed emails without a domain.
         */
        it("should reject email without domain", () => {
            expect(isEmailAllowed("invalidemail")).toBe(false);
        });

        /**
         * Should reject empty string input.
         */
        it("should reject empty string", () => {
            expect(isEmailAllowed("")).toBe(false);
        });

        /**
         * Should reject null input.
         */
        it("should reject null email", () => {
            expect(isEmailAllowed(null)).toBe(false);
        });

        /**
         * Should reject undefined input.
         */
        it("should reject undefined email", () => {
            expect(isEmailAllowed(undefined)).toBe(false);
        });

        /**
         * Should reject emails with domains that contain but don't end with @ualg.pt.
         * This is a critical security test to prevent domain spoofing attacks.
         */
        it("should reject email with similar but different domain", () => {
            expect(isEmailAllowed("user@ualg.pt.fake.com")).toBe(false);
        });
    });

    /**
     * Test cases for edge cases and unusual inputs.
     * Validates behavior with technically valid but unusual email formats.
     */
    describe("Edge cases", () => {
        /**
         * Should accept an email that is literally just the domain.
         */
        it("should handle email with only @ualg.pt", () => {
            expect(isEmailAllowed("@ualg.pt")).toBe(true);
        });
    });
});
describe("Student ID Extraction", () => {
    describe("Valid student emails", () => {
        it("should extract student number from standard student email", () => {
            expect(extractStudentId("a84014@ualg.pt")).toBe("84014");
        });

        it("should extract student number with different digits", () => {
            expect(extractStudentId("a12345@ualg.pt")).toBe("12345");
        });
    });

    describe("Non-student emails", () => {
        it("should return null for professor email", () => {
            expect(extractStudentId("joao.silva@ualg.pt")).toBeNull();
        });

        it("should return null for email starting with a but no digits", () => {
            expect(extractStudentId("ana@ualg.pt")).toBeNull();
        });

        it("should return null for email with digits but no leading a", () => {
            expect(extractStudentId("84014@ualg.pt")).toBeNull();
        });

        it("should return null for mixed format", () => {
            expect(extractStudentId("a84014abc@ualg.pt")).toBeNull();
        });
    });

    describe("Edge cases", () => {
        it("should return null for null input", () => {
            expect(extractStudentId(null)).toBeNull();
        });

        it("should return null for undefined input", () => {
            expect(extractStudentId(undefined)).toBeNull();
        });

        it("should return null for empty string", () => {
            expect(extractStudentId("")).toBeNull();
        });
    });
});
