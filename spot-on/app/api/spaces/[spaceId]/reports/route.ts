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
        if (!body.reason || body.reason.trim() === '') {
            return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
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
                status: 'ACCEPTED',
            }
        });
        if (isParticipant) {
            return NextResponse.json({
                error: 'Participants cannot report the session'
            }, { status: 403 });
        }
        let report;
        try {
            report = await prisma.$transaction(async (tx) => {
                const existingReport = await tx.report.findFirst({
                    where: {
                        sessionId: activeSession.id,
                        status: 'OPEN',
                    }
                });
                if (existingReport) {
                    throw new Error('DUPLICATE');
                }
                const recentReport = await tx.report.findFirst({
                    where: {
                        session: { spaceId },
                        status: 'OPEN',
                        createdAt: {
                            gt: new Date(Date.now() - 1000 * 60 * 30)
                        },
                    }
                });
                if (recentReport) {
                    throw new Error('COOLDOWN');
                }
                return await tx.report.create({
                    data: {
                        reporterId: session.user.id,
                        sessionId: activeSession.id,
                        reason: body.reason,
                    }
                });
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'DUPLICATE') {
                    return NextResponse.json({
                        error: 'This session has already been reported'
                    }, { status: 409 });
                }
                if (error.message === 'COOLDOWN') {
                    return NextResponse.json({
                        error: 'This space has already been reported in the last 30 minutes'
                    }, { status: 409 });
                }
            }
            throw error;
        }
        return NextResponse.json(report, { status: 201 });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}
