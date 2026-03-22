/**
 * @fileoverview API route handler for QR verification and session creation.
 *
 * @module app/api/qrcode/verify/route
 */

import { handleQrVerification } from '@/lib/qrcode-verify';

/**
 * @swagger
 * /api/qrcode/verify:
 *   post:
 *     summary: Occupy a space via HMAC-signed QR code
 *     description: Verifies a scanned QR code signature and creates a new active session for the authenticated user.
 *     tags:
 *       - QR Code
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conflict
 *       500:
 *         description: Internal Server Error
 */
export async function POST(request: Request) {
    return handleQrVerification(request);
}
