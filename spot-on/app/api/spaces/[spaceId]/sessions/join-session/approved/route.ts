import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveNotificationById } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { sendApprovedJoinRequestEmail } from "@/lib/send-notification-email";
import { getServerSession } from "next-auth";
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
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = await Promise.resolve(params);
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
        const isHost = await prisma.studySession.findFirst({
            where: {
                hostId: session.user.id,
                status: 'ACTIVE'
            }
        });
        if (studySession.hostId !== session.user.id) {
            return NextResponse.json({
                error: 'You are not the host of this session.'
            }, { status: 403 });
        }
        if (!isHost) {
            return NextResponse.json({
                error: 'You are not the host of this session.'
            },
                { status: 403 });
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
            data: {
                status: 'ACCEPTED'
            }
        });
        const requester = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (requester?.email) {
            if (notificationId) {
                await resolveNotificationById(notificationId);
            }
            await sendApprovedJoinRequestEmail(requester.email);
        }
        return NextResponse.json(updateJoinSession, { status: 200 });
    } catch (error) {
        console.error('Error approving session:', error);
        return NextResponse.json({ error: 'Failed to approve session' },
            { status: 500 });
    }
}
