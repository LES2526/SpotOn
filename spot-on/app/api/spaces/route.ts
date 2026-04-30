import { SpaceType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { NextResponse } from 'next/server';

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
