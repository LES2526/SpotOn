/**
 * @fileoverview API route handler for confirming reports in a specific space.
 *
 * Allows session host or accepted participants to confirm an open report.
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
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } };

/**
 * @swagger
 * /api/spaces/{spaceId}/reports/confirm:
 *   patch:
 *     summary: Confirm an open report
 *     description: Confirms an open report for the active session in the space. Only the host or accepted participants of the active session can confirm.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space where the report is being confirmed
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
 *                 description: Current QR token displayed in the target space
 *     responses:
 *       200:
 *         description: Report confirmed successfully
 *       400:
 *         description: Bad Request - Invalid QR token or report confirmation window has expired
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       403:
 *         description: Forbidden - User is not host or accepted participant of the active session
 *       404:
 *         description: Not Found - Space, active session, or open report not found
 *       500:
 *         description: Internal Server Error - An unexpected error occurred
 */

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
                    return { expired: true };
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
        if (report && 'expired' in report) {
            return NextResponse.json({
                error: 'The time to confirm this report has expired'
            }, { status: 400 });
        }
        return NextResponse.json(report, { status: 200 });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}
