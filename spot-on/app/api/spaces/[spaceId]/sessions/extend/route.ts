import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };

export const PATCH = async (_request: Request, { params }: Params) => {
    try {
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
        const { expectedEndTime } = await _request.json();
        if (!expectedEndTime) {
            return NextResponse.json(
                { error: 'Expected end time is required' },
                { status: 400 });
        }
        const newEndTime = new Date(expectedEndTime);
        if (newEndTime.getHours() * 60 + newEndTime.getMinutes() > 1230) {
            return NextResponse.json(
                { error: 'Is not allowed to extend session beyond 20:30' },
                { status: 400 }
            );
        }
        const studySession = await prisma.studySession.findFirst({
            where: {
                spaceId,
                hostId: session.user.id,
                status: 'ACTIVE'
            }
        });
        if (!studySession) {
            return NextResponse.json(
                { error: 'No active session found for this space and user' },
                { status: 404 }
            );
        }
        const updatedSession = await prisma.studySession.update({
            where: { id: studySession.id },
            data: { expectedEndTime: new Date(expectedEndTime) }
        });
        return NextResponse.json(updatedSession, { status: 200 });
    } catch (error) {
        console.error('Error extending session:', error);
        return NextResponse.json(
            { error: 'Failed to extend session' },
            { status: 500 }
        );
    }
}
