/**
 * @fileoverview API route handler for confirming open reports on active study sessions.
 *
 * Implements lazy expiration: if the report's confirmation deadline has passed,
 * the first PATCH call expires the report and either ends the session (no confirmations)
 * or removes non-confirming participants and optionally transfers host (partial confirmations).
 *
 * Requires authentication via NextAuth.js session.
 *
 * @module app/api/spaces/[spaceId]/reports/confirm/route
 * @requires next-auth
 * @requires @/lib/prisma
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

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

async function handleActiveReport(tx: Tx, reportId: string,
    sessionId: string, hostId: string, userId: string) {
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

/**
 * @swagger
 * /api/spaces/{spaceId}/reports/confirm:
 *   patch:
 *     summary: Confirm an open report for an active session
 *     description: |
 *       Allows the session host or an accepted participant to confirm an open report
 *       by presenting the current QR token of the space.
 *
 *       **Confirmation flow:**
 *       - All accepted participants **and** the host must confirm.
 *       - Once all required users confirm, the report is marked as `RESOLVED`.
 *       - Before that, each confirmation returns a `pending` acknowledgement.
 *
 *       **Lazy expiration (deadline passed):**
 *       - If `timeToConfirm` has elapsed and **nobody** confirmed previously,
 *         the session is marked as `EXPIRED` and the space becomes free.
 *       - If `timeToConfirm` has elapsed but **some** users confirmed previously,
 *         non-confirming participants are removed (`REJECTED`) and, if the host
 *         did not confirm, leadership is transferred to the earliest confirmer.
 *         The session itself continues.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space whose active session report is being confirmed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrToken
 *             properties:
 *               qrToken:
 *                 type: string
 *                 description: Current QR token displayed on the space's tablet
 *     responses:
 *       200:
 *         description: |
 *           Successful response — one of three possible outcomes:
 *           - `{ status: "RESOLVED" }` — all required users confirmed.
 *           - `{ message: "Confirmation registered, waiting for others" }` — confirmation saved, still waiting.
 *           - `{ message: "Session expired, space is now free" }` — deadline passed, no prior confirmations.
 *           - `{ message: "Time expired, session continues with confirmed users" }` — deadline passed, some prior confirmations existed.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: RESOLVED
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Confirmation registered, waiting for others
 *       400:
 *         description: Bad Request — invalid QR token
 *       401:
 *         description: Unauthorized — user is not authenticated
 *       403:
 *         description: Forbidden — user is not the host or an accepted participant of the active session
 *       404:
 *         description: Not Found — space, active session, or open report not found
 *       409:
 *         description: Conflict — user has already confirmed this report
 *       500:
 *         description: Internal Server Error — an unexpected error occurred
 */
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
