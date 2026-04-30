import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

import { buildQrUrl } from '@/lib/qr-utils';
import { findSpace } from '@/lib/space-utils';


/**
 * Route parameter type containing the target space identifier.
 *
 * @typedef {Object} Params
 * @property {Promise<{ spaceId: string }>} params - Resolved route parameters
 */
type Params = { params: Promise<{ spaceId: string }> };


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
export async function GET(_request: Request, { params }: Params) {
    const { spaceId } = await params;

    console.log(`Received request for QR code of space ${spaceId}`);

    if (!spaceId) {
        return NextResponse.json({ error: 'Missing spaceId parameter' }, { status: 400 });
    }

    const space = await findSpace(spaceId);

    if (!space) {
        return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const activeSession = await prisma.studySession.findFirst({
        where: {
            spaceId,
            status: 'ACTIVE',
            expectedEndTime: { gt: new Date() },
        },
        select: { id: true },
    });

    const qrCodeURL: string = buildQrUrl(spaceId, process.env.NEXTAUTH_URL || 'http://localhost:3000');

    return NextResponse.json({
        qrCodeURL,
        isOccupied: Boolean(activeSession),
        currentQrToken: space.currentQrToken,
    });
}
