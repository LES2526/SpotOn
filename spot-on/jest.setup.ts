/**
 * @fileoverview Jest setup file for global test configuration.
 *
 * This file runs once before all test suites to configure the testing environment.
 * Imports custom matchers from @testing-library/jest-dom for enhanced assertions.
 *
 * @module jest.setup
 * @requires @testing-library/jest-dom
 *
 * @see {@link https://github.com/testing-library/jest-dom|jest-dom Documentation}
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

/**
 * Import custom Jest matchers from Testing Library.
 *
 * Adds helpful matchers for DOM assertions:
 * - `toBeInTheDocument()` - Element is in the DOM
 * - `toBeVisible()` - Element is visible to the user
 * - `toBeDisabled()` - Element is disabled
 * - `toHaveValue()` - Input/select has a specific value
 * - And many more...
 *
 * @see {@link https://github.com/testing-library/jest-dom#custom-matchers|Custom Matchers}
 */
import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

/**
 * Polyfill for TextEncoder/TextDecoder.
 *
 * Required for Prisma Client in Jest environment (jsdom doesn't include these by default).
 * These are used by crypto functions in Prisma's dependencies.
 */
globalThis.TextEncoder ??= TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder ??= TextDecoder as typeof globalThis.TextDecoder;

/**
 * Polyfill for Web Crypto API.
 *
 * Required for NextAuth and related crypto operations in Jest environment.
 * jsdom doesn't provide crypto.subtle or crypto.randomUUID by default.
 */
globalThis.crypto ??= webcrypto as Crypto;

jest.mock('@/lib/send-notification-email', () => ({
    sendProofOfPresenceEmail: jest.fn().mockResolvedValue(undefined),
    sendJoinRequestEmail: jest.fn().mockResolvedValue(undefined),
    sendNotAcceptedJoinRequestEmail: jest.fn().mockResolvedValue(undefined),
    sendApprovedJoinRequestEmail: jest.fn().mockResolvedValue(undefined),
    sendSessionExpiringSoonEmail: jest.fn().mockResolvedValue(undefined),
}));
