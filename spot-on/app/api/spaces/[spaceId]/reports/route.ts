/**
 * @fileoverview API route handler for creating reports about active study sessions in a specific space.
 *
 * Requires authentication via NextAuth.js session.
 *
 * @module app/api/spaces/[spaceId]/reports/route
 * @requires next-auth
 * @requires @/lib/prisma
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { scheduleReportExpiry } from "@/lib/report-expiry";
import { requireAuth } from "@/lib/require-auth";
import { findSpace } from "@/lib/space-utils";
import { sendProofOfPresenceEmail } from "@/lib/send-notification-email";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/reports:
 *   post:
 *     summary: Create a report for an active session
 *     description: Allows an authenticated external user to report an active study session in a space by validating the QR token and providing a reason.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space where the report is being submitted
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrToken
 *               - reason
 *             properties:
 *               qrToken:
 *                 type: string
 *                 description: Current QR token displayed in the target space
 *               reason:
 *                 type: string
 *                 description: Report reason provided by the user
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Bad Request - Invalid QR token, missing reason, or self-report attempt
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       403:
 *         description: Forbidden - Accepted participants cannot report the session
 *       404:
 *         description: Not Found - Space or active session not found
 *       409:
 *         description: Conflict - Session already reported or report cooldown is active
 *       500:
 *         description: Internal Server Error - An unexpected error occurred
 */

export const POST = async (_request: Request, props: Params) => {
    try {
        const params = await props.params;
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = params;
        const space = await findSpace(spaceId);
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
                /* This code snippet is querying the database to find a recent report within the last
                30 minutes for a specific space. */
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
        const host = await prisma.user.findUnique({
            where: { id: activeSession.hostId },
            select: { email: true },
        });
        if (host?.email) {
            sendProofOfPresenceEmail(host.email);
        }
        await createNotification(
            activeSession.hostId,
            'PROOF_OF_PRESENCE',
            'A tua presença foi questionada! Tens 10 minutos para fazeres scan do QR code ou perdes o lugar.',
        );
        scheduleReportExpiry(report.id, activeSession.hostId, report.timeToConfirm);
        return NextResponse.json(report, { status: 201 });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Failed to create report' },
            { status: 500 });
    }
}
