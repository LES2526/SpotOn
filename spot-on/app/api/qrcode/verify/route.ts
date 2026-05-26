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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spaceId
 *               - qrWindow
 *               - sig
 *             properties:
 *               spaceId:
 *                 type: string
 *                 description: The ID of the space being occupied
 *                 example: "abc123"
 *               qrWindow:
 *                 type: number
 *                 description: The time window value from the scanned QR code URL
 *                 example: 348305280
 *               sig:
 *                 type: string
 *                 description: The HMAC signature from the scanned QR code URL
 *                 example: "a3f9c2d1..."
 *               expectedEndTime:
 *                 type: string
 *                 format: date-time
 *                 description: Optional desired session end time (defaults to 15 min from now, capped at library closing time)
 *                 example: "2026-05-26T18:00:00.000Z"
 *     responses:
 *       200:
 *         description: OK - Confirmed presence or session already active
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Confirmed Presence
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Session already active
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 spaceId:
 *                   type: string
 *                 hostId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [ACTIVE]
 *                 expectedEndTime:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad Request - invalid or expired QR code, or after library hours
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conflict - space already occupied or user has an active session
 *       500:
 *         description: Internal Server Error
 */
export async function POST(request: Request) {
    return handleQrVerification(request);
}
