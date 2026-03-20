import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FloorFilter from "@/components/floor/FloorFilter";
import SpaceCard from "@/components/space/SpaceCard";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

type DashboardSpace = {
    id: string;
    name: string;
    capacity: number;
    hasPowerOutlet: boolean;
    type: string;
    description: string | null;
    sessions: Array<{ id: string }>;
};

export default async function DashboardPage({ searchParams }: Readonly<{ searchParams: Promise<{ floor?: string }> }>) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/api/auth/signin?callbackUrl=/dashboard');
    }
    const { floor } = await searchParams;
    const selectedFloor = floor ?? null;
    const [spaces, floorPlans] = await Promise.all([
        prisma.space.findMany({
            include: {
                floorPlan: { select: { name: true } },
                sessions: {
                    where: {
                        status: 'ACTIVE',
                        expectedEndTime: { gt: new Date() }
                    },
                    select: { id: true },
                    take: 1,
                },
            },
            where: selectedFloor ? { floorPlan: { name: selectedFloor } } : undefined,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.floorPlan.findMany({
            select: { name: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    return (
        <main className="min-h-screen bg-gray-950 p-8 text-white">
            <section className="mx-auto max-w-6xl">
                <DashboardHeader />
                <FloorFilter floorPlans={floorPlans} selectedFloor={selectedFloor} />

                {spaces.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        Nenhum espaço encontrado.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {spaces.map((space: DashboardSpace) => (
                            <SpaceCard
                                key={space.id}
                                id={space.id}
                                name={space.name}
                                capacity={space.capacity}
                                hasPowerOutlet={space.hasPowerOutlet}
                                type={space.type}
                                description={space.description}
                                isOccupied={space.sessions.length > 0}
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
