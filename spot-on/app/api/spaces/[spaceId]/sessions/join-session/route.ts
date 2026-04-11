import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { sendJoinRequestEmail } from "@/lib/send-notification-email";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: { spaceId: string } | Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions/join-session:
 *   post:
 *     summary: Request to join an active study session
 *     description: Creates a pending join request for the authenticated user in the active session for the specified space.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space whose active session should be joined
 *     responses:
 *       201:
 *         description: Join request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   description: ID of the study session being joined
 *                 userId:
 *                   type: string
 *                   description: ID of the user who requested to join
 *                 status:
 *                   type: string
 *                   enum: [PENDING]
 *                   description: Status of the join request
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Space or active session not found
 *       409:
 *         description: Conflict - user already has an active session or pending join request
 *       500:
 *         description: Internal Server Error
 */

export async function POST(_request: Request, { params }: Params) {
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
        const alreadyAHostInAnySession = await prisma.studySession.findFirst({
            where: {
                hostId: session.user.id,
                status: 'ACTIVE'
            }
        });
        if (alreadyAHostInAnySession) {
            return NextResponse.json({
                error: 'You are already hosting a session. Please release it first.'
            },
                { status: 409 });
        }
        const alreadyJoinedInAnySession = await prisma.userOnStudySession.findFirst({
            where: {
                userId: session.user.id,
                status: {
                    in: ['PENDING', 'ACCEPTED']
                }
            }
        });
        if (alreadyJoinedInAnySession) {
            return NextResponse.json({
                error: 'You have already requested to join this session'
            },
                { status: 409 });
        }
        const joinSession = await prisma.userOnStudySession.upsert({
            where: {
                userId_sessionId: {
                    userId: session.user.id,
                    sessionId: studySession.id,
                }
            },
            update: { status: 'PENDING' },
            create: {
                userId: session.user.id,
                sessionId: studySession.id,
                status: 'PENDING'
            }
        });
        await createNotification(
            studySession.hostId,
            'JOIN_REQUEST',
            JSON.stringify({
                text: `${session.user.email} quer juntar-se à tua sessão.`,
                requesterId: session.user.id,
                requesterEmail: session.user.email,
                spaceId,
            }),
        );
        const host = await prisma.user.findUnique({
            where: { id: studySession.hostId },
            select: { email: true },
        });
        if (host?.email && session.user.email) {
            await sendJoinRequestEmail(host.email, session.user.email);
        }
        return NextResponse.json(joinSession, { status: 201 });
    } catch (error) {
        console.error('Error joining session:', error);
        return NextResponse.json({ error: 'Failed to join session' },
            { status: 500 });
    }
}
