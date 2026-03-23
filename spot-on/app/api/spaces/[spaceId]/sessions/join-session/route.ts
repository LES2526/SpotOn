import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };

export async function POST(_request: Request, { params }: Params) {
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
        const studySession = await prisma.studySession.findFirst({
            where: {
                spaceId,
                status: 'ACTIVE'
            }
        });
        if (!studySession) {
            return NextResponse.json({ error: 'Study session not found' },
                { status: 404 });
        }
        const alreadyAHostInAnySession = await prisma.studySession.findFirst({
            where: {
                hostId: session.user.id,
                status: 'ACTIVE'
            }
        });
        if (alreadyAHostInAnySession) {
            return NextResponse.json({
                error: 'You are already hosting a session. Please release it first.'
            },
                { status: 409 });
        }
        const alreadyJoinedInAnySession = await prisma.userOnStudySession.findFirst({
            where: {
                userId: session.user.id,
                status: {
                    in: ['PENDING', 'ACCEPTED']
                }
            }
        });
        if (alreadyJoinedInAnySession) {
            return NextResponse.json({
                error: 'You have already requested to join this session'
            },
                { status: 409 });
        }
        const joinSession = await prisma.userOnStudySession.create({
            data: {
                userId: session.user.id,
                sessionId: studySession.id,
                status: 'PENDING'
            }
        });
        return NextResponse.json({ success: true, joinSession });
    } catch (error) {
        console.error('Error joining session:', error);
        return NextResponse.json({ error: 'Failed to join session' },
            { status: 500 });
    }
}
