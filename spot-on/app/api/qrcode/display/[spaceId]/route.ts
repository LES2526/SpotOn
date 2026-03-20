
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { buildQrUrl, verifyQrCode, VerifyResult } from '@/lib/qr-utils';
import { scheduleSessionExpiry } from '@/lib/session-expiry';
import { clampToClosingTime } from '@/lib/library-hours';


/**
 * Route parameter type containing the target space identifier.
 *
 * @typedef {Object} Params
 * @property {Promise<{ spaceId: string }>} params - Resolved route parameters
 */
type Params = { params: { spaceId: string } };


/**
 * @swagger
 * /api/qrcode/display/{spaceId}:
 *   get:
 *     summary: Get the current QR code URL for a space
 *     description: >
 *       Returns a freshly generated HMAC-signed QR code URL for the given space.
 *       The URL is valid for the current 5-second time window plus a grace period
 *       covering the previous window. Intended to be polled every 5 seconds by
 *       the space's display tablet to keep the QR code up to date.
 *       This endpoint is public and does not require authentication.
 *     tags:
 *       - QR Code
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The space's database ID
 *         example: "abc123"
 *     responses:
 *       200:
 *         description: QR code URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCodeURL:
 *                   type: string
 *                   description: A fully-formed URL to be encoded into a QR image, valid for ~10 seconds.
 *                   example: "http://localhost:3000/qrcode?spaceId=abc123&window=348305280&sig=a3f9c2d1..."
 *       400:
 *         description: Bad Request - spaceId is missing
 *       404:
 *         description: Not Found - no space exists with the given ID
 *       500:
 *         description: Internal Server Error
 */
export async function GET(_request: Request, { params }: { params: { spaceId: string } }) {
    const { spaceId } = await params;

    console.log(`Received request for QR code of space ${spaceId}`);

    if(!spaceId) {
        return NextResponse.json({ error: 'Missing spaceId parameter' }, { status: 400 });
    }

    const existingSpace = await prisma.space.findUnique({ where: { id: spaceId } });

    if (!existingSpace) {
        return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const qrCodeURL: string = buildQrUrl(spaceId, process.env.NEXTAUTH_URL || 'http://localhost:3000');

    return NextResponse.json({ qrCodeURL });
}

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions:
 *   patch:
 *     summary: Update the expected end time of an active session
 *     description: >
 *       Updates the expectedEndTime of the authenticated user's active session
 *       in the specified space. Useful for when a user wants to extend or shorten
 *       their session after occupying a space via QR code.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space whose session should be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expectedEndTime
 *             properties:
 *               expectedEndTime:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 datetime for when the session should end. Must be in the future.
 *                 example: "2026-03-09T15:00:00.000Z"
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       400:
 *         description: Bad Request - expectedEndTime is in the past or missing
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       404:
 *         description: Not Found - no active session exists for this user in this space
 *       500:
 *         description: Internal Server Error
 */
export async function PATCH(request: Request, { params }: { params: { spaceId: string } }) {
    const { expectedEndTime } = await request.json();
    const { spaceId } = await params;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const activeSession = await prisma.studySession.findFirst({
            where: {
                spaceId,
                hostId: session.user.id,
                status: 'ACTIVE',
            },
        });

        if (!activeSession) {
            return NextResponse.json({ error: 'No active session found for this space and user' }, { status: 404 });
        }

        if (new Date(expectedEndTime) <= new Date()) {
            return NextResponse.json(
                { error: 'expectedEndTime must be in the future' },
                { status: 400 },
            );
        }

        var expectedEndDate = await clampToClosingTime(new Date(expectedEndTime));

        const updatedSession = await prisma.studySession.update({
            where: { id: activeSession.id },
            data: { expectedEndTime: expectedEndDate },
        });

        scheduleSessionExpiry(updatedSession.id, expectedEndDate);

        return NextResponse.json(updatedSession, { status: 200 });
    } catch (error) {
        console.error('Error updating session via QR code:', error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}