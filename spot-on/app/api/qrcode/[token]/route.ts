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
 * /api/qrcode/{token}:
 *   post:
 *     summary: Occupy a space via QR code
 *     description: >
 *       Creates a new active study session for the authenticated user in the space
 *       identified by the QR token. Semantically equivalent to
 *       POST /api/spaces/{spaceId}/sessions but keyed by QR token, which supports
 *       future token rotation without exposing internal IDs in printed codes.
 *       Session duration defaults to 1 hour if no end time is provided.
 *     tags:
 *       - QR Code
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The QR token printed on the space's label
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expectedEndTime:
 *                 type: string
 *                 format: date-time
 *                 description: Optional ISO 8601 datetime for when the session should end. Defaults to 1 hour from now.
 *                 example: "2026-03-09T15:00:00.000Z"
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Bad Request - expectedEndTime is in the past
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       404:
 *         description: Not Found - No space matches this QR token
 *       409:
 *         description: Conflict - Space is already occupied, or user already has an active session
 *       500:
 *         description: Internal Server Error
 */

/**
 * POST handler — Occupy a space via QR token.
 *
 * Resolves the QR token to a space, then creates a new ACTIVE study session
 * for the authenticated user with a 1-hour expected duration.
 *
 * Rejects with 409 if:
 * - The space already has an ACTIVE session
 * - The user already has an ACTIVE session in any other space
 *
 * @param {Request} _request - Incoming HTTP request (unused)
 * @param {Params} params - Route parameters containing the QR token
 * @returns {Promise<NextResponse>} The created session object with status 201, or an error response
 *
 * @throws {401} If the user is not authenticated
 * @throws {404} If no space matches the given token
 * @throws {409} If the space is already occupied or the user has an active session
 * @throws {500} If an unexpected error occurs
 */
export async function POST(_request: Request, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { token } = await params;

        const body = await _request.json().catch(() => ({}));
        const expectedEndTime = body.expectedEndTime 
            ? new Date(body.expectedEndTime) 
            : new Date(Date.now() + 60 * 60 * 1000);

        // Resolve QR token → space
        const space = await prisma.space.findUnique({
            where: { currentQrToken: token },
            select: { id: true },
        });

        if (!space) {
            return NextResponse.json({ error: 'QR code not recognised' }, { status: 404 });
        }

        // Check if the space is already occupied by an active session
        const spaceOccupied = await prisma.studySession.findFirst({
            where: { spaceId: space.id, status: 'ACTIVE' },
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

        if (expectedEndTime <= new Date()) {
            return NextResponse.json(
                { error: 'expectedEndTime must be in the future' },
                { status: 400 },
            );
        }

        // Create the study session with a default 1-hour window
        const newSession = await prisma.studySession.create({
            data: {
                spaceId: space.id,
                hostId: session.user.id,
                expectedEndTime,
            },
        });

        return NextResponse.json(newSession, { status: 201 });
    } catch (error) {
        console.error('Error creating session via QR code:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}