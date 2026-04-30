import { resolveNotificationById } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { findActiveSession, findSpace } from "@/lib/space-utils";
import { sendNotAcceptedJoinRequestEmail } from "@/lib/send-notification-email";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions/join-session/rejected:
 *   patch:
 *     summary: Reject a join-session request
 *     description: Updates a pending join request to rejected for the active session in the specified space.
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
 *                 description: The user ID of the join request to reject
 *     responses:
 *       200:
 *         description: Join request rejected successfully. An email is sent to the requester.
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
 *                   example: REJECTED
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
        const updateJoinSession = await prisma.userOnStudySession.update({
            where: {
                userId_sessionId: {
                    userId,
                    sessionId: studySession.id
                }
            },
            data: { status: 'REJECTED' }
        });
        const requester = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (requester?.email) {
            await resolveNotificationById(notificationId);
            await sendNotAcceptedJoinRequestEmail(requester.email);
        }
        return NextResponse.json(updateJoinSession, { status: 200 });
    } catch (error) {
        console.error('Error rejecting session:', error);
        return NextResponse.json({ error: 'Failed to reject session' },
            { status: 500 });
    }
}
