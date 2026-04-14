/**
 * @fileoverview HMAC-based QR code utilities for Spot-On.
 *
 * Provides stateless, time-windowed QR code generation and verification
 * using HMAC-SHA256. No database writes are needed to rotate tokens —
 * the signature is recomputed on demand from the spaceId and the current
 * 5-second window.
 *
 * @module lib/qr-utils
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Duration of each QR window in milliseconds. */
const WINDOW_MS = 30000;

/**
 * Returns the current window number.
 *
 * Time is divided into fixed 5-second buckets. All moments within the same
 * bucket share the same window number and therefore the same QR signature.
 *
 * @example
 * // At 12:00:00.000 and 12:00:04.999 → same window
 * // At 12:00:05.000 → next window
 * currentWindow() // e.g. 348305280
 */
export function currentWindow(): number {
    return Math.floor(Date.now() / WINDOW_MS);
}

/**
 * Returns the previous window number.
 *
 * Used for grace-period verification: a QR scanned at the very end of a
 * window may arrive at the server after the window has already rotated.
 * Accepting the previous window covers this ~5 second gap.
 */
export function previousWindow(): number {
    return currentWindow() - 1;
}

/**
 * Computes an HMAC-SHA256 signature for a given spaceId and window.
 *
 * The signature is derived from `spaceId:window` using the QR_SECRET
 * environment variable as the key. The same inputs always produce the
 * same output, so the server can verify without storing anything.
 *
 * @param spaceId - The space's database ID
 * @param window  - The time window number (from currentWindow())
 * @returns A hex-encoded HMAC-SHA256 signature
 *
 * @throws {Error} If QR_SECRET is not set in the environment
 *
 * @example
 * generateSignature('abc123', currentWindow())
 * // → 'a3f9c2d1e4b5...' (64 hex chars)
 */
export function generateSignature(spaceId: string, window: number): string {
    const secret = process.env.QR_SECRET;
    if (!secret) throw new Error('QR_SECRET environment variable is not set');

    return createHmac('sha256', secret)
        .update(`${spaceId}:${window}`)
        .digest('hex');
}

/**
 * Builds the full QR code URL for a given space.
 *
 * Embeds the spaceId, current window, and HMAC signature as query params.
 * This URL should be encoded into the QR image displayed on the space's tablet.
 *
 * The URL rotates every 5 seconds as the window advances.
 *
 * @param spaceId  - The space's database ID
 * @param baseUrl  - The application base URL (e.g. "http://localhost:3000")
 * @returns A fully-formed URL string ready to be encoded into a QR image
 *
 * @example
 * buildQrUrl('abc123', 'https://spoton.ualg.pt')
 * // → 'https://spoton.ualg.pt/qrcode?spaceId=abc123&window=348305280&sig=a3f9c2d1...'
 */
export function buildQrUrl(spaceId: string, baseUrl: string): string {
    const window = currentWindow();
    const sig = generateSignature(spaceId, window);

    const url = new URL('/qrcode', baseUrl);
    url.searchParams.set('spaceId', spaceId);
    url.searchParams.set('window', String(window));
    url.searchParams.set('sig', sig);

    return url.toString();
}

/**
 * Result of a QR code verification attempt.
 */
export type VerifyResult =
    | { valid: true; spaceId: string; window: number }
    | { valid: false; reason: 'missing_params' | 'expired' | 'invalid_signature' };

/**
 * Verifies a QR code URL's signature and window freshness.
 *
 * Accepts both the current and previous window to handle the edge case
 * where a QR is scanned just before rotation and the request arrives
 * just after.
 *
 * Verification steps:
 * 1. Check all required params are present
 * 2. Check the window is current or previous (not expired)
 * 3. Recompute the expected HMAC and compare using a timing-safe comparison
 *
 * @param spaceId - The spaceId query param from the scanned URL
 * @param window  - The window query param from the scanned URL (as a number)
 * @param sig     - The sig query param from the scanned URL
 * @returns A VerifyResult indicating success or the reason for failure
 *
 * @example
 * const result = verifyQrCode('abc123', 348305280, 'a3f9c2d1...');
 * if (result.valid) {
 *   // proceed to create session
 * } else {
 *   // result.reason → 'expired' | 'invalid_signature' | 'missing_params'
 * }
 */
export function verifyQrCode(
    spaceId: string | null,
    window: number | null,
    sig: string | null,
): VerifyResult {
    // Step 1 — all params must be present

    if (!spaceId || window === null || window === undefined || !sig) {
        return { valid: false, reason: 'missing_params' };
    }

    const windowNumber = Number(window);

    // Step 2 — window must be current or previous (grace period)
    const now = currentWindow();
    if (windowNumber !== now && windowNumber !== previousWindow()) {
        return { valid: false, reason: 'expired' };
    }

    // Step 3 — timing-safe HMAC comparison
    const expected = generateSignature(spaceId, windowNumber);

    try {
        const sigBuffer = Buffer.from(sig, 'hex');
        const expectedBuffer = Buffer.from(expected, 'hex');

        // Buffers must be the same length for timingSafeEqual
        if (sigBuffer.length !== expectedBuffer.length) {
            return { valid: false, reason: 'invalid_signature' };
        }

        const match = timingSafeEqual(sigBuffer, expectedBuffer);
        return match
            ? { valid: true, spaceId, window: windowNumber }
            : { valid: false, reason: 'invalid_signature' };
    } catch {
        return { valid: false, reason: 'invalid_signature' };
    }
}
