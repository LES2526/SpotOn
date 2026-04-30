import {
    calculateCheckoutPoints,
    findActiveSession,
    findCheckedOutSession,
    incrementPoints,
    notifyOp,
    removeParticipantOp,
} from '@/lib/checkout-utils';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { NextResponse } from 'next/server';

type Params = { params: { spaceId: string } };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions/checkout:
 *   post:
 *
 *     summary: Check out from a study session
 *     description: >
 *       Handles all early checkout scenarios for an active session in the specified space.
 *       If `targetUserId` is provided, the host removes that participant.
 *       Otherwise, the caller leaves (or ends the session if host with no members).
 *       Leadership is transferred to the earliest participant if the host leaves while members remain.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space where the session is active
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 description: ID of the participant to remove (host only)
 *     responses:
 *       200:
 *         description: Checkout processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - description: Session ended (host alone)
 *                   type: object
 *                   properties:
 *                     checkout:
 *                       type: string
 *                       enum: [session_ended]
 *                     pointsAwarded:
 *                       type: number
 *                 - description: Member left the session
 *                   type: object
 *                   properties:
 *                     checkout:
 *                       type: string
 *                       enum: [member_left]
 *                     pointsAwarded:
 *                       type: number
 *                 - description: Leadership transferred to next member
 *                   type: object
 *                   properties:
 *                     checkout:
 *                       type: string
 *                       enum: [leadership_transferred]
 *                     newHostId:
 *                       type: string
 *                     pointsAwarded:
 *                       type: number
 *                 - description: Participant removed by host
 *                   type: object
 *                   properties:
 *                     checkout:
 *                       type: string
 *                       enum: [participant_removed]
 *                     removedUserId:
 *                       type: string
 *                     pointsAwarded:
 *                       type: number
 *                 - description: User already checked out (idempotency)
 *                   type: object
 *                   properties:
 *                     alreadyCheckedOut:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       403:
 *         description: Forbidden - only the host can remove participants
 *       404:
 *         description: Not Found - no active session or participant not found
 *       500:
 *         description: Internal Server Error
 */
export async function POST(request: Request, { params }: Params) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spaceId } = params;
        const userId = session.user.id;
        const body = await request.json().catch(() => ({}));
        const { targetUserId } = body;

        const activeSession = await findActiveSession(spaceId, userId);

        if (!activeSession) {
            const alreadyCheckedOut = await findCheckedOutSession(spaceId, userId);
            if (alreadyCheckedOut) {
                return NextResponse.json({ alreadyCheckedOut: true }, { status: 200 });
            }
            return NextResponse.json(
                { error: 'No active session found for this user in this space' },
                { status: 404 },
            );
        }

        const isHost = activeSession.hostId === userId;

        const acceptedParticipants = await prisma.userOnStudySession.findMany({
            where: { sessionId: activeSession.id, status: 'ACCEPTED' },
            orderBy: { joinedAt: 'asc' },
        });

        const occupancy = 1 + acceptedParticipants.length;
        const { type: spaceType, capacity } = activeSession.space;

        // Case C: host removing a specific participant
        if (targetUserId) {
            if (!isHost) {
                return NextResponse.json({ error: 'Only the host can remove participants' }, { status: 403 });
            }
            const participant = acceptedParticipants.find(p => p.userId === targetUserId);
            if (!participant) {
                return NextResponse.json({ error: 'Participant not found in this session' }, { status: 404 });
            }
            const points = calculateCheckoutPoints(participant.joinedAt, spaceType, occupancy, capacity);
            await prisma.$transaction([
                removeParticipantOp(targetUserId, activeSession.id),
                incrementPoints(targetUserId, points),
                notifyOp(userId, 'KICKED_FROM_SESSION',
                    'You successfully removed a participant from the session.'),
                notifyOp(targetUserId, 'KICKED_FROM_SESSION',
                    'You have been removed from the session by the host.'),
            ]);
            return NextResponse.json({
                checkout: 'participant_removed',
                removedUserId: targetUserId, pointsAwarded: points
            });
        }

        // Case A: host alone — end session
        if (isHost && acceptedParticipants.length === 0) {
            const points = calculateCheckoutPoints(activeSession.startTime,
                spaceType, occupancy, capacity);
            await prisma.$transaction([
                prisma.studySession.update({
                    where: { id: activeSession.id },
                    data: { status: 'COMPLETED', actualEndTime: new Date() },
                }),
                incrementPoints(userId, points),
                notifyOp(userId, 'CHECKOUT',
                    'Your session has ended. See you next time!'),
            ]);
            return NextResponse.json({ checkout: 'session_ended', pointsAwarded: points });
        }

        // Case B1: regular member leaving
        if (!isHost) {
            const participant = acceptedParticipants.find(p => p.userId === userId)!;
            const points = calculateCheckoutPoints(participant.joinedAt, spaceType, occupancy, capacity);
            await prisma.$transaction([
                removeParticipantOp(userId, activeSession.id),
                incrementPoints(userId, points),
                notifyOp(userId, 'CHECKOUT', 'You have left the session.'),
            ]);
            return NextResponse.json({ checkout: 'member_left', pointsAwarded: points });
        }

        // Case B2: host with members — transfer leadership
        const nextHost = acceptedParticipants[0];
        const points = calculateCheckoutPoints(activeSession.startTime, spaceType, occupancy, capacity);
        await prisma.$transaction([
            prisma.studySession.update({
                where: { id: activeSession.id },
                data: { hostId: nextHost.userId },
            }),
            removeParticipantOp(nextHost.userId, activeSession.id),
            incrementPoints(userId, points),
            notifyOp(userId, 'CHECKOUT', 'You have left the session.'),
            notifyOp(nextHost.userId, 'LEADERSHIP_TRANSFERRED', 'You are now the host of the session.'),
        ]);
        return NextResponse.json({ checkout: 'leadership_transferred', newHostId: nextHost.userId, pointsAwarded: points });

    } catch (error) {
        console.error('Error during checkout:', error);
        return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
    }
}
