import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FloorFilter from "@/components/floor/FloorFilter";
import FloorPlanSection from "@/components/floor-plan/FloorPlanSection";
import SpaceCard from "@/components/space/SpaceCard";
import { prisma } from "@/lib/prisma";
import { FloorPlanData } from "@/components/floor-plan/type";
import fs from "fs"
import path from "path"
import OccupanceCard from "@/components/occupance/SpacesOccupance";


// Disable caching so occupancy status is always up to date
export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: Readonly<{ searchParams: Promise<{ floor?: string }> }>) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/api/auth/signin?callbackUrl=/dashboard');
    }

    // Read the selected floor from the URL query param (?floor=Piso 1)
    const { floor } = await searchParams;
    const selectedFloor = floor != undefined ? Number(floor) : null;

    // Fetch all data in parallel to avoid waterfall requests
    const [spaces, floorPlans, floorPlan] = await Promise.all([
        // Spaces filtered by floor (if selected), with their active sessions
        prisma.space.findMany({
            include: {
                // Only fetch active, non-expired sessions — used to determine occupancy
                sessions: {
                    where: { status: 'ACTIVE', expectedEndTime: { gt: new Date() } },
                    select: { id: true, expectedEndTime: true},
                    take: 1,
                },
            },
            where: selectedFloor ? { floorPlan: { floor: selectedFloor } } : undefined,
            orderBy: { createdAt: 'desc' },
        }),
        // All floor — used to populate the floor selector
        prisma.floorPlan.findMany({
            select: { floor: true },
            orderBy: { floor: 'asc' },
        }),
        // SVG image info for the selected floor — used to render the floor plan
        prisma.floorPlan.findFirst({
            where: selectedFloor ? { floor: selectedFloor} : undefined,
            select: { imageUrl: true, imageWidth: true, imageHeight: true},
        })
    ]);

    

    // No floor plan found means there's nothing to render
    if (!floorPlan) {
        return (
            <main className="min-h-screen bg-gray-950 p-8 text-white">
                <p className="text-gray-500">Nenhuma planta disponível.</p>
            </main>
        );
    }

    const svgPath = path.join(process.cwd(), "public", floorPlan.imageUrl);
    const svgRaw = fs.readFileSync(svgPath, "utf-8");  
    const viewBoxMatch = svgRaw.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch?.[1] ?? `0 0 ${floorPlan.imageWidth} ${floorPlan.imageHeight}`;
    const svgContent = svgRaw.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); //strip
    
    // Map Prisma result to the FloorPlanData DTO (Data Transfer Object) used by the floor plan components
    const floorPlanData: FloorPlanData = {
        imageUrl: floorPlan.imageUrl,
        imageWidth: floorPlan.imageWidth,
        imageHeight: floorPlan.imageHeight,
        viewBox,
        svgContent,
        spaces: spaces.map(space => ({
            id: space.id,
            name: space.name,
            capacity: space.capacity,
            type: space.type,
            hasPowerOutlet: space.hasPowerOutlet,
            description: space.description,
            points: space.points,
            isOccupied: space.sessions.length > 0,
            expectedEndTime: space.sessions[0]?.expectedEndTime ?? null,
            shape: space.shape,
    })),
};  
    const totalDesks: number = floorPlanData.spaces.filter(s => s.type === "INDIVIDUAL_DESK").length
    const occupiedDesks: number = floorPlanData.spaces.filter(s => s.type === "INDIVIDUAL_DESK" && s.isOccupied).length
    const totalRooms: number = floorPlanData.spaces.filter(s => s.type === "GROUP_ROOM").length
    const occupiedRooms: number = floorPlanData.spaces.filter(s => s.type === "GROUP_ROOM" && s.isOccupied).length

    return (
        <main className="min-h-screen bg-gray-950 p-8 text-white">
            <section className="mx-auto max-w-6xl">
                <DashboardHeader />
                <FloorFilter floorPlans={floorPlans} selectedFloor={selectedFloor} />
                <FloorPlanSection floorPlan={floorPlanData} />
                <OccupanceCard totalDesks={totalDesks} occupiedDesks={occupiedDesks} totalRooms={totalRooms} occupiedRooms={occupiedRooms} />
          {/*       {{spaces.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum pllzespaço encontrado.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {spaces.map((space) => (
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
                )} }    */}
            </section>
        </main>
    );
}
