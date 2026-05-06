/**
 * @fileoverview API route handler to resolve a QR token into its associated space.
 *
 * @module app/api/qrcode/[token]/route
 */

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { NextResponse } from 'next/server';

type Params = { params: Promise<{ token: string }> };

/**
 * @swagger
 * /api/qrcode/{token}:
 *   get:
 *     summary: Resolve a QR token to its space
 *     description: Returns the space associated with the given QR token, including current occupancy status.
 *     tags:
 *       - QR Code
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The QR token printed on the space's label
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
 *                   description: Space ID
 *                 name:
 *                   type: string
 *                   description: Space name
 *                 capacity:
 *                   type: integer
 *                   description: Maximum number of people
 *                 hasPowerOutlet:
 *                   type: boolean
 *                   description: Whether the space has a power outlet
 *                 type:
 *                   type: string
 *                   nullable: true
 *                   description: Space type (e.g. desk, room)
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 floorPlan:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                 isOccupied:
 *                   type: boolean
 *                   description: Whether the space currently has an active session
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: QR code not recognised
 */
export async function GET(_request: Request, props: Params) {
    const session = await requireAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { token } = params;

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
