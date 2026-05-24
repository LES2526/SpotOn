import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SpaceType } from "@/app/generated/prisma";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SpacePanel from "@/components/dashboard/SpacePanel";
import FloorPlanSection from "@/components/floor-plan/FloorPlanSection";
import { FloorPlanData } from "@/components/floor-plan/type";
import FloorFilter from "@/components/floor/FloorFilter";
import OccupanceCard from "@/components/occupance/SpacesOccupance";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import fs from "node:fs";
import path from "node:path";

// Disable caching so occupancy status is always up to date
export const dynamic = "force-dynamic";

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

    const selectedFloor = floor === undefined ? 0 : Number(floor);

    const spaceType = type && Object.values(SpaceType).includes(type as SpaceType)
        ? (type as SpaceType)
        : undefined;

    const userSession = await getServerSession(authOptions);
    const userId = userSession?.user?.id;

    const [spaces, floorPlans, floorPlan, userActiveSession] = await Promise.all([
        prisma.space.findMany({
            include: {
                sessions: {
                    where: { status: 'ACTIVE', expectedEndTime: { gt: new Date() } },
                    select: {
                        id: true,
                        expectedEndTime: true,
                        hostId: true,
                        host: { select: { id: true, email: true } },
                        participants: {
                            select: { user: { select: { id: true, email: true } } },
                        },
                    },
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
        prisma.floorPlan.findMany({
            select: { floor: true },
            orderBy: { floor: 'asc' },
        }),
        prisma.floorPlan.findFirst({
            where: selectedFloor !== null ? { floor: selectedFloor } : undefined,
            select: { imageUrl: true, imageWidth: true, imageHeight: true },
        }),
        userId ? prisma.studySession.findFirst({
            where: {
                status: 'ACTIVE',
                expectedEndTime: { gt: new Date() },
                OR: [
                    { hostId: userId },
                    { participants: { some: { userId } } },
                ],
            },
            select: { spaceId: true, hostId: true, expectedEndTime: true },
        }) : null,
    ]);

    if (!floorPlan) {
        return (
            <main className="min-h-screen bg-gray-950 p-4 md:p-8 text-white">
                <p className="text-gray-500">Nenhuma planta disponível.</p>
            </main>
        );
    }

    const svgPath = path.join(process.cwd(), "public", floorPlan.imageUrl);
    const svgRaw = fs.readFileSync(svgPath, "utf-8");
    const viewBoxMatch = svgRaw.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch?.[1] ?? `0 0 ${floorPlan.imageWidth} ${floorPlan.imageHeight}`;
    const svgContent = svgRaw.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

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
            currentUserIsInSession: space.id === userActiveSession?.spaceId,
            currentUserIsHost: space.id === userActiveSession?.spaceId && userActiveSession?.hostId === userId,
            currentOcuppants: space.sessions[0]
                ? 1 + (space.sessions[0].participants?.length ?? 0)
                : 0,
            participantsList: space.sessions[0]
                ? [
                    {
                        id: space.sessions[0].host.id,
                        name: null,
                        email: space.sessions[0].host.email,
                        isHost: true,
                    },
                    ...(space.sessions[0].participants ?? []).map(p => ({
                        id: p.user.id,
                        name: null,
                        email: p.user.email,
                        isHost: false,
                    })),
                ]
                : [],
        })),
    };

    const totalDesks: number = floorPlanData.spaces.filter(s => s.type === "INDIVIDUAL_DESK").length;
    const occupiedDesks: number = floorPlanData.spaces.filter(s => s.type === "INDIVIDUAL_DESK" && s.isOccupied).length;
    const totalRooms: number = floorPlanData.spaces.filter(s => s.type === "GROUP_ROOM").length;
    const occupiedRooms: number = floorPlanData.spaces.filter(s => s.type === "GROUP_ROOM" && s.isOccupied).length;

    return (
        <main className="min-h-screen bg-gray-950 p-8 text-white">
            <section className="mx-auto max-w-6xl">
                <DashboardHeader leftSlot={<SpacePanel spaces={floorPlanData.spaces} />} />
                <FloorFilter floorPlans={floorPlans} selectedFloor={selectedFloor} />
                <FloorPlanSection
                    floorPlan={floorPlanData}
                    userSession={userActiveSession ? {
                        spaceId: userActiveSession.spaceId,
                        expectedEndTime: userActiveSession.expectedEndTime,
                        isHost: userActiveSession.hostId === userId,
                    } : null}
                />
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
