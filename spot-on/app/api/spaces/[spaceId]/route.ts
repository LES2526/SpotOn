import { SpaceType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { NextResponse } from 'next/server';


/**
 * @swagger
 * /api/spaces/{spaceId}:
 *   get:
 *     summary: List spaces with optional filters
 *     description: Returns spaces filtered by the given query parameters.
 *     tags:
 *       - Spaces
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INDIVIDUAL_DESK, GROUP_ROOM]
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: integer
 *         description: Minimum number of seats required
 *       - in: query
 *         name: hasPowerOutlet
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: hasComputer
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: hasInteractiveBoard
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isOccupied
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: floor
 *         schema:
 *           type: string
 *         description: Floor plan name
 *     responses:
 *       200:
 *         description: Filtered list of spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 spaces:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
    const session = await requireAuth();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const parseBool = (val: string | null) =>
        val === null ? undefined : val === 'true';

    const typeParam = searchParams.get('type');

    const type = typeParam && Object.values(SpaceType).includes(typeParam as SpaceType) ? (typeParam as SpaceType)
        : undefined;

    const capacity = searchParams.get('capacity');
    const hasPowerOutlet = parseBool(searchParams.get('hasPowerOutlet'));
    const hasComputer = parseBool(searchParams.get('hasComputer'));
    const hasInteractiveBoard = parseBool(searchParams.get('hasInteractiveBoard'));
    const isOccupied = searchParams.get('isOccupied');
    const selectedFloor = searchParams.get('floor');

    try {
        const spaces = await prisma.space.findMany({
            where: {
                floorPlan: selectedFloor
                    ? { name: selectedFloor }
                    : undefined,

                type: type || undefined,
                capacity: capacity ? { gte: parseInt(capacity) } : undefined,
                hasPowerOutlet,
                hasComputer,
                hasInteractiveBoard,

                sessions: isOccupied
                    ? isOccupied === 'true'
                        ? {
                            some: {
                                status: 'ACTIVE',
                                expectedEndTime: { gt: new Date() },
                            },
                        }
                        : {
                            none: {
                                status: 'ACTIVE',
                                expectedEndTime: { gt: new Date() },
                            },
                        }
                    : undefined,
            },

            include: {
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

            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ spaces });
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
