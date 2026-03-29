/**
 * @fileoverview API route handler to resolve a QR token into its associated space.
 *
 * @module app/api/qrcode/[token]/route
 */

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: QR code not recognised
 */
export async function GET(_request: Request, props: Params) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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
