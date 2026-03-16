import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };

export const GET = async (_request: Request, { params }: Params) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized' }, { status: 401 });
    }
    const { spaceId } = params;
    const space = await prisma.space.findUnique({
        where: { id: spaceId }
    });
    if (!space) {
        return NextResponse.json({ error: 'Space not found' },
            { status: 404 });
    }
    const activeSession = await prisma.studySession.findFirst({
        where: { spaceId, hostId: session.user.id, status: 'ACTIVE' },
    });
    if (!activeSession) {
        return NextResponse.json({ report: null }, { status: 200 });
    }
    const report = await prisma.report.findFirst({
        where: { sessionId: activeSession.id, status: 'OPEN' }
    });
    return NextResponse.json({ report }, { status: 200 });
}
