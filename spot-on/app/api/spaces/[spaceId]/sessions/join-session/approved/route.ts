import { resolveNotificationById } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { sendApprovedJoinRequestEmail } from "@/lib/send-notification-email";
import { findActiveSession, findSpace } from "@/lib/space-utils";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions/join-session/approved:
 *   patch:
 *     summary: Approve a join-session request
 *     description: Updates a pending join request to accepted for the active session in the specified space.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space whose active session contains the request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The user ID of the join request to approve
 *     responses:
 *       200:
 *         description: Join request approved successfully. An email is sent to the requester.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   example: ACCEPTED
 *       400:
 *         description: Bad Request - userId missing from body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user is not the host of the active session
 *       404:
 *         description: Space or active session not found
 *       500:
 *         description: Internal Server Error
 */

export async function PATCH(_request: Request, { params }: Params) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = await Promise.resolve(params);
        const space = await findSpace(spaceId);
        if (!space) {
            return NextResponse.json({ error: 'Space not found' },
                { status: 404 });
        }
        const studySession = await findActiveSession(spaceId);
        if (!studySession) {
            return NextResponse.json({ error: 'Study session not found' },
                { status: 404 });
        }
        if (studySession.hostId !== session.user.id) {
            return NextResponse.json({
                error: 'You are not the host of this session.'
            }, { status: 403 });
        }

        const body = await _request.json();
        const { userId, notificationId } = body;
        const pending = await prisma.joinRequest.findFirst({
            where: {
                userId: userId,
                studySessionId: studySession.id,
                status: 'PENDING'
            }
        });
        if (!pending) {
            return NextResponse.json({ error: 'No pending request found.' }, { status: 404 });
        }

        const currentOccupancy = await prisma.userOnStudySession.count({
            where: { sessionId: studySession.id },
        });
        if (currentOccupancy >= space.capacity - 1) {
            return NextResponse.json({ error: 'Session is already at full capacity.' }, { status: 409 });
        }

        const acceptJoinRequest = await prisma.joinRequest.update({
            where: { id: pending.id },
            data: { status: 'ACCEPTED' }
        });

        await prisma.userOnStudySession.create({
            data: {
                userId,
                sessionId: studySession.id,
            }
        });
        const requester = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!requester) {
            return NextResponse.json({ error: 'Requester not found' }, { status: 404 });
        }
        if (notificationId) {
            await resolveNotificationById(notificationId);
        }
        if (requester.email) {
            sendApprovedJoinRequestEmail(requester.email).catch(err =>
                console.error('Failed to send approved join request email:', err));
        }

        return NextResponse.json(acceptJoinRequest, { status: 200 });
    } catch (error) {
        console.error('Error approving session:', error);
        return NextResponse.json({ error: 'Failed to approve session' },
            { status: 500 });
    }
}
