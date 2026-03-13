import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };
type Tx = Prisma.TransactionClient;

async function handleExpiredReport(tx: Tx, reportId: string,
    sessionId: string, hostId: string) {
    await tx.report.update({
        where: { id: reportId },
        data: { status: 'EXPIRED' }
    });
    const confirmations = await tx.reportConfirmation.findMany({
        where: { reportId },
        orderBy: { confirmedAt: 'asc' },
    });
    if (confirmations.length === 0) {
        await tx.studySession.update({
            where: { id: sessionId },
            data: { status: 'EXPIRED', actualEndTime: new Date() }
        });
        return { expired: true, sessionEnded: true };
    }
    const confirmedUserIds = new Set(confirmations.map(c => c.userId));
    const participants = await tx.userOnStudySession.findMany({
        where: { sessionId, status: 'ACCEPTED' }
    });
    const notConfirmed = participants
        .filter(p => !confirmedUserIds.has(p.userId))
        .map(p => p.userId);
    if (notConfirmed.length > 0) {
        await tx.userOnStudySession.updateMany({
            where: { sessionId, userId: { in: notConfirmed } },
            data: { status: 'REJECTED' }
        });
    }
    if (!confirmedUserIds.has(hostId)) {
        await tx.studySession.update({
            where: { id: sessionId },
            data: { hostId: confirmations[0].userId }
        });
    }
    return { expired: true, sessionEnded: false };
}

async function handleActiveReport(tx: Tx, reportId: string, sessionId: string, hostId: string, userId: string) {
    await tx.reportConfirmation.create({
        data: { reportId, userId }
    });
    const participants = await tx.userOnStudySession.findMany({
        where: { sessionId, status: 'ACCEPTED' }
    });
    const whoNeedsToConfirm =
        [hostId, ...participants.map(p => p.userId)];
    const confirmations = await tx.reportConfirmation.findMany({
        where: { reportId }
    });
    const allConfirmed = whoNeedsToConfirm.every(
        id => confirmations.some(c => c.userId === id)
    );
    if (allConfirmed) {
        return await tx.report.update({
            where: { id: reportId },
            data: { status: 'RESOLVED' }
        });
    }
    return { pending: true };
}

export const PATCH = async (_request: Request, { params }: Params) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = params;
        const space = await prisma.space.findUnique({ where: { id: spaceId } });
        if (!space) {
            return NextResponse.json({ error: 'Space not found' }, { status: 404 });
        }
        const { qrToken } = await _request.json();
        if (space.currentQrToken !== qrToken) {
            return NextResponse.json({ error: 'Invalid QR token' }, { status: 400 });
        }
        const activeSession = await prisma.studySession.findFirst({
            where: { spaceId, status: 'ACTIVE' },
        });
        if (!activeSession) {
            return NextResponse.json({ error: 'No active session found for this space' }, { status: 404 });
        }
        const isParticipant = await prisma.userOnStudySession.findFirst({
            where: { userId: session.user.id, sessionId: activeSession.id, status: 'ACCEPTED' }
        });
        if (!isParticipant && activeSession.hostId !== session.user.id) {
            return NextResponse.json({ error: 'Only participants and host can confirm reports' }, { status: 403 });
        }
        let report;
        try {
            report = await prisma.$transaction(async (tx) => {
                const existingReport = await tx.report.findFirst({
                    where: { sessionId: activeSession.id, status: 'OPEN' }
                });
                if (!existingReport) throw new Error('NOT_FOUND');
                const alreadyConfirmed = await tx.reportConfirmation.findFirst({
                    where: { reportId: existingReport.id, userId: session.user.id }
                });
                if (alreadyConfirmed) throw new Error('DUPLICATE');

                if (existingReport.timeToConfirm < new Date()) {
                    return handleExpiredReport(tx, existingReport.id, activeSession.id, activeSession.hostId);
                }
                return handleActiveReport(tx, existingReport.id, activeSession.id, activeSession.hostId, session.user.id);
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'NOT_FOUND') {
                    return NextResponse.json({
                        error: 'No open report found for this session'
                    }, { status: 404 });
                }
                if (error.message === 'DUPLICATE') {
                    return NextResponse.json({
                        error: 'You have already confirmed this report'
                    }, { status: 409 });
                }
                throw error;
            }
        }
        if (report && 'expired' in report) {
            const msg = report.sessionEnded
                ? 'Session expired, space is now free'
                : 'Time expired, session continues with confirmed users';
            return NextResponse.json({ message: msg }, { status: 200 });
        }
        if (report && 'pending' in report) {
            return NextResponse.json({
                message: 'Confirmation registered, waiting for others'
            }, { status: 200 });
        }
        return NextResponse.json(report, { status: 200 });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({
            error: 'Failed to update report'
        }, { status: 500 });
    }
};
