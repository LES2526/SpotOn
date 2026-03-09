import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };

export const POST = async (_request: Request, { params }: Params) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = params;
        const space = await prisma.space.findUnique({
            where: { id: spaceId }
        });
        if (!space) {
            return NextResponse.json({ error: 'Space not found' },
                { status: 404 });
        }
        const body = await _request.json();
        const { qrToken } = body;
        if (space.currentQrToken !== qrToken) {
            return NextResponse.json({ error: 'Invalid QR token' },
                { status: 400 });
        }
        const activeSession = await prisma.studySession.findFirst({
            where: { spaceId, status: 'ACTIVE' },
        });
        if (!activeSession) {
            return NextResponse.json({
                error: 'No active session found for this space'
            }, { status: 404 });
        }
        if (activeSession.hostId === session.user.id) {
            return NextResponse.json({
                error: 'You cannot report your own session'
            }, { status: 400 });
        }
        const isParticipant = await prisma.userOnStudySession.findFirst({
            where: {
                userId: session.user.id,
                sessionId: activeSession.id,
            }
        });
        if (isParticipant) {
            return NextResponse.json({
                error: 'Participants cannot report the session'
            }, { status: 403 });
        }
        const existingReport = await prisma.report.findFirst({
            where: {
                reporterId: session.user.id,
                sessionId: activeSession.id,
                status: 'OPEN',
            }
        });
        if (existingReport) {
            return NextResponse.json({
                error: 'You have already reported this session'
            }, { status: 409 });
        }
        const recentReport = await prisma.report.findFirst({
            where: {
                session: { spaceId },
                createdAt: { gt: new Date(Date.now() - 1000 * 60 * 30) },
            }
        });
        if (recentReport) {
            return NextResponse.json({
                error: 'This space has already been reported in the last 30 minutes'
            }, { status: 429 });
        }
        const report = await prisma.report.create({
            data: {
                reporterId: session.user.id,
                sessionId: activeSession.id,
                reason: body.reason,
            }
        });
        return NextResponse.json(report, { status: 201 });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}
