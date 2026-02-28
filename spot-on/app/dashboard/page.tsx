import OccupyButton from '@/components/dashboard/OccupyButton';
import StudyDesk from '@/components/study-desk/StudyDesk';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const spaces = await prisma.space.findMany({
        include: {
            sessions: {
                where: {
                    status: 'ACTIVE',
                    expectedEndTime: {
                        gt: new Date(),
                    },
                },
                select: { id: true },
                take: 1,
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <main className="min-h-screen p-8">
            <section className="mx-auto max-w-6xl">
                <h1 className="mb-6 text-3xl font-bold">Study Desks</h1>
                {spaces.length === 0
                    ? (
                        <p className="text-sm opacity-70">
                            No study spaces found.
                        </p>
                    )
                    : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {spaces.map((space) => {
                                const isOccupied = space.sessions.length > 0;
                                return (
                                    <article key={space.id} className="rounded-lg border p-4">
                                        <h2 className="text-lg font-semibold">
                                            {space.name}
                                        </h2>
                                        <p className="text-sm opacity-70">
                                            Capacity: {space.capacity}
                                        </p>
                                        <StudyDesk
                                            seats={space.capacity > 1 ? 4 : 1}
                                            shape={space.type === 'GROUP_ROOM' ? 'rectangular' : 'circular'}
                                            initialStatus={isOccupied ? 'occupied' : 'available'}
                                        />
                                        <OccupyButton spaceId={space.id} isOccupied={isOccupied} />
                                    </article>
                                );
                            })}
                        </div>
                    )}
            </section>
        </main>
    );
}
