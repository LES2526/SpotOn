/**
 * @fileoverview API route handlers for QR code-based space lookup and session creation.
 *
 * Provides endpoints to resolve a QR token to its associated space,
 * and to occupy that space via QR code scan.
 *
 * @module app/api/qrcode/[token]/route
 * @requires next-auth
 * @requires @/lib/prisma
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { verifyQrCode, VerifyResult } from '@/lib/qr-utils';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Route parameter type containing the QR token.
 *
 * @typedef {Object} Params
 * @property {Promise<{ token: string }>} params - Resolved route parameters
 */
type Params = { params: { token: string } };

/**
 * @swagger
 * /api/qrcode/{token}:
 *   get:
 *     summary: Resolve a QR token to its space
 *     description: Returns the space associated with the given QR token, including its current occupancy status. Requires authentication.
 *     tags:
 *       - QR Code
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The QR token printed on the space's label (e.g. "qr-mesa-a1")
 *     responses:
 *       200:
 *         description: Space found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 capacity:
 *                   type: integer
 *                 hasPowerOutlet:
 *                   type: boolean
 *                 type:
 *                   type: string
 *                   enum: [INDIVIDUAL_DESK, GROUP_ROOM]
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 isOccupied:
 *                   type: boolean
 *                 floorPlan:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       404:
 *         description: Not Found - No space matches this QR token
 */

/**
 * GET handler — Resolve a QR token to its associated space.
 *
 * Looks up the space by its `currentQrToken` and returns public space
 * details along with live occupancy status. Requires an active session.
 *
 * @param {Request} _request - Incoming HTTP request (unused)
 * @param {Params} params - Route parameters containing the QR token
 * @returns {Promise<NextResponse>} Space data with occupancy status, or an error response
 *
 * @throws {401} If the user is not authenticated
 * @throws {404} If no space matches the given token
 */
export async function GET(_request: Request, { params }: Params) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    const space = await prisma.space.findUnique({
        where: { currentQrToken: token },
        select: {
            id: true,
            name: true,
            capacity: true,
            hasPowerOutlet: true,
            type: true,
            description: true,
            floorPlan: { select: { name: true } },
            sessions: {
                where: {
                    status: 'ACTIVE',
                    expectedEndTime: { gt: new Date() },
                },
                select: { id: true },
                take: 1,
            },
        },
    });

    if (!space) {
        return NextResponse.json({ error: 'QR code not recognised' }, { status: 404 });
    }

    const { sessions, ...rest } = space;

    return NextResponse.json({
        ...rest,
        isOccupied: sessions.length > 0,
    });
}

/**
 * @swagger
 * /api/qrcode/verify:
 *   post:
 *     summary: Occupy a space via HMAC-signed QR code
 *     description: >
 *       Verifies the HMAC signature and time window of a scanned QR code,
 *       then creates a new active study session for the authenticated user
 *       in the identified space. Session duration defaults to 1 hour if no
 *       end time is provided.
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
 *                 description: The space's database ID, embedded in the QR code URL.
 *                 example: "abc123"
 *               qrWindow:
 *                 type: integer
 *                 description: The time window the QR was generated in (Math.floor(Date.now() / 5000)).
 *                 example: 348305280
 *               sig:
 *                 type: string
 *                 description: HMAC-SHA256 signature hex string proving the QR is genuine.
 *                 example: "a3f9c2d1e4b5..."
 *               expectedEndTime:
 *                 type: string
 *                 format: date-time
 *                 description: Optional ISO 8601 end time. Defaults to 1 hour from now.
 *                 example: "2026-03-09T15:00:00.000Z"
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Bad Request - invalid/expired QR signature, or expectedEndTime is in the past
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       409:
 *         description: Conflict - space is already occupied, or user already has an active session
 *       500:
 *         description: Internal Server Error
 */
export async function POST(_request: Request, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spaceId, qrWindow, sig, expectedEndTime } = await _request.json();

        const qrCode: VerifyResult = verifyQrCode(spaceId, qrWindow, sig);

        if (qrCode.valid === false) {
            return NextResponse.json({ error: qrCode.reason }, { status: 400 });
        }

        const rawEndTime = expectedEndTime
            ? new Date(expectedEndTime)
            : new Date(Date.now() + 60 * 60 * 1000);

        // Check if the space is already occupied by an active session
        const spaceOccupied = await prisma.studySession.findFirst({
            where: { spaceId: qrCode.spaceId, status: 'ACTIVE' },
        });
        if (spaceOccupied) {
            return NextResponse.json({ error: 'Space is already occupied' }, { status: 409 });
        }

        // Check if the user already has an active session elsewhere
        const userOccupied = await prisma.studySession.findFirst({
            where: { hostId: session.user.id, status: 'ACTIVE' },
        });
        if (userOccupied) {
            return NextResponse.json(
                { error: 'You already have an active session. Please release it first.' },
                { status: 409 },
            );
        }

        if (rawEndTime <= new Date()) {
            return NextResponse.json(
                { error: 'expectedEndTime must be in the future' },
                { status: 400 },
            );
        }

        // Create the study session with a default 1-hour window
        const newSession = await prisma.studySession.create({
            data: {
                spaceId: qrCode.spaceId,
                hostId: session.user.id,
                expectedEndTime: rawEndTime,
            },
        });

        return NextResponse.json(newSession, { status: 201 });
    } catch (error) {
        console.error('Error creating session via QR code:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
