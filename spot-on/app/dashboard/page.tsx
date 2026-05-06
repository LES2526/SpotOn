import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FloorPlanSection from "@/components/floor-plan/FloorPlanSection";
import { FloorPlanData } from "@/components/floor-plan/type";
import FloorFilter from "@/components/floor/FloorFilter";
import OccupanceCard from "@/components/occupance/SpacesOccupance";
import { prisma } from "@/lib/prisma";
import { SpaceType } from "@/app/generated/prisma";
import fs from "node:fs";
import path from "node:path";

// Disable caching so occupancy status is always up to date
export const dynamic = 'force-dynamic';

type SearchParams = {
    floor?: string;
    type?: string;
    hasPowerOutlet?: string;
    hasComputer?: string;
    hasInteractiveBoard?: string;
    isOccupied?: string;
};

const parseBool = (val: string | undefined) =>
    val === undefined ? undefined : val === 'true';

export default async function DashboardPage({ searchParams }: Readonly<{ searchParams: Promise<SearchParams> }>) {
    const { floor, type, hasPowerOutlet, hasComputer, hasInteractiveBoard, isOccupied } = await searchParams;

    const selectedFloor = floor === undefined ? null : Number(floor);

    // Validate type against SpaceType enum
    const spaceType = type && Object.values(SpaceType).includes(type as SpaceType)
        ? (type as SpaceType)
        : undefined;

    // Fetch all data in parallel to avoid waterfall requests
    const [spaces, floorPlans, floorPlan] = await Promise.all([
        // Spaces filtered by floor and panel filters, with their active sessions
        prisma.space.findMany({
            include: {
                // Only fetch active, non-expired sessions — used to determine occupancy
                sessions: {
                    where: { status: 'ACTIVE', expectedEndTime: { gt: new Date() } },
                    select: { id: true, expectedEndTime: true },
                    take: 1,
                },
            },
            where: {
                floorPlan: selectedFloor !== null ? { floor: selectedFloor } : undefined,
                type: spaceType,
                hasPowerOutlet: parseBool(hasPowerOutlet),
                hasComputer: parseBool(hasComputer),
                hasInteractiveBoard: parseBool(hasInteractiveBoard),
                sessions: isOccupied
                    ? isOccupied === 'true'
                        ? { some: { status: 'ACTIVE', expectedEndTime: { gt: new Date() } } }
                        : { none: { status: 'ACTIVE', expectedEndTime: { gt: new Date() } } }
                    : undefined,
            },
            orderBy: { createdAt: 'desc' },
        }),
        // All floors — used to populate the floor selector
        prisma.floorPlan.findMany({
            select: { floor: true },
            orderBy: { floor: 'asc' },
        }),
        // SVG image info for the selected floor — used to render the floor plan
        prisma.floorPlan.findFirst({
            where: selectedFloor !== null ? { floor: selectedFloor } : undefined,
            select: { imageUrl: true, imageWidth: true, imageHeight: true },
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
    const svgContent = svgRaw.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); // strip outer svg tag

    // Map Prisma result to the FloorPlanData DTO used by the floor plan components
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
            hasComputer: space.hasComputer,
            hasInteractiveBoard: space.hasInteractiveBoard,
            description: space.description,
            points: space.points,
            isOccupied: space.sessions.length > 0,
            expectedEndTime: space.sessions[0]?.expectedEndTime ?? null,
            shape: space.shape,
        })),
    };

    const totalDesks: number = floorPlanData.spaces.filter(s => s.type === "INDIVIDUAL_DESK").length;
    const occupiedDesks: number = floorPlanData.spaces.filter(s => s.type === "INDIVIDUAL_DESK" && s.isOccupied).length;
    const totalRooms: number = floorPlanData.spaces.filter(s => s.type === "GROUP_ROOM").length;
    const occupiedRooms: number = floorPlanData.spaces.filter(s => s.type === "GROUP_ROOM" && s.isOccupied).length;

    return (
        <main className="min-h-screen bg-gray-950 p-8 text-white">
            <section className="mx-auto max-w-6xl">
                <DashboardHeader />
                <FloorFilter floorPlans={floorPlans} selectedFloor={selectedFloor} />
                <FloorPlanSection floorPlan={floorPlanData} />
                <OccupanceCard
                    totalDesks={totalDesks}
                    occupiedDesks={occupiedDesks}
                    totalRooms={totalRooms}
                    occupiedRooms={occupiedRooms}
                />
            </section>
        </main>
    );
}