import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };

export const PATCH = async (_request: Request, { params }: Params) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 401 });
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
            return NextResponse.json(
                { error: 'No active session found for this space' },
                { status: 404 });
        }
        const isParticipant = await prisma.userOnStudySession.findFirst({
            where: {
                userId: session.user.id,
                sessionId: activeSession.id,
                status: 'ACCEPTED',
            }
        });
        if (!isParticipant && activeSession.hostId !== session.user.id) {
            return NextResponse.json(
                { error: 'Only participants and host can confirm reports' },
                { status: 403 });
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
                if (!existingReport) {
                    throw new Error('NOT_FOUND');
                }
                if (existingReport.timeToConfirm < new Date()) {
                    await tx.report.update({
                        where: { id: existingReport.id },
                        data: {
                            status: 'EXPIRED',
                        }
                    });
                    await tx.studySession.update({
                        where: { id: activeSession.id },
                        data: {
                            status: 'EXPIRED',
                            actualEndTime: new Date()
                        }
                    });
                    throw new Error('EXPIRED');
                }
                return await tx.report.update({
                    where: { id: existingReport.id },
                    data: {
                        status: 'RESOLVED',
                        confirmedAt: new Date(),
                    }
                });
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'NOT_FOUND') {
                    return NextResponse.json({
                        error: 'No open report found for this session'
                    }, { status: 404 });
                }
                if (error.message === 'EXPIRED') {
                    return NextResponse.json({
                        error: 'The time to confirm this report has expired'
                    }, { status: 400 });
                }
                throw error;
            }
        }
        return NextResponse.json(report, { status: 200 });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}
