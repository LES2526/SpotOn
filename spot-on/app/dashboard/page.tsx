import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SpacePanel from "@/components/dashboard/SpacePanel";
import FloorFilter from "@/components/floor/FloorFilter";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

type SearchParams = {
    floor?: string;
    type?: string;
    hasPowerOutlet?: string;
    hasComputer?: string;
    hasInteractiveBoard?: string;
    isOccupied?: string;
    capacity?: string;
};

export default async function DashboardPage({
    searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/api/auth/signin?callbackUrl=/dashboard');
    }

    const params = await searchParams;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('next-auth.session-token')?.value;

    // Build query string for /api/spaces
    const query = new URLSearchParams();
    if (params.floor) query.set('floor', params.floor);
    if (params.type) query.set('type', params.type);
    if (params.hasPowerOutlet) query.set('hasPowerOutlet', params.hasPowerOutlet);
    if (params.hasComputer) query.set('hasComputer', params.hasComputer);
    if (params.hasInteractiveBoard) query.set('hasInteractiveBoard', params.hasInteractiveBoard);
    if (params.isOccupied) query.set('isOccupied', params.isOccupied);
    if (params.capacity) query.set('capacity', params.capacity);

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    const [spacesRes, floorPlans] = await Promise.all([
        fetch(`${baseUrl}/api/spaces?${query.toString()}`, {
            cache: 'no-store',
            headers: {
                Cookie: `next-auth.session-token=${sessionToken}`,
            },
        }),
        prisma.floorPlan.findMany({
            select: { name: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    const { spaces } = await spacesRes.json();

    const mappedSpaces = spaces?.map((space: any) => ({
        id: space.id,
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        hasPowerOutlet: space.hasPowerOutlet,
        hasComputer: space.hasComputer,
        hasInteractiveBoard: space.hasInteractiveBoard,
        isOccupied: space.sessions.length > 0,
    })) ?? [];

    return (
        <main className="relative min-h-screen bg-gray-950 text-white overflow-hidden">
            {/* Header */}
            <div className="relative z-10 px-8 pt-8">
                <DashboardHeader />
                <FloorFilter floorPlans={floorPlans} selectedFloor={params.floor ?? null} />
            </div>

            {/* Blueprint SVG area — fills the rest of the screen */}
            <div className="relative w-full" style={{ height: 'calc(100vh - 140px)' }}>
                {/* Placeholder for the SVG blueprint */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-700 text-sm">Library blueprint goes here</p>
                </div>

                {/* Floating space panel */}
                <SpacePanel spaces={mappedSpaces} />
            </div>
        </main>
    );
}