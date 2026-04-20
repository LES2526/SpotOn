import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
    calculateCheckoutPoints,
    findActiveSession,
    findCheckedOutSession,
    incrementPoints,
    notifyOp,
    removeParticipantOp,
} from '@/lib/checkout-utils';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

type Params = { params: { spaceId: string } };

export async function POST(request: Request, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
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
                notifyOp(userId, 'KICKED_FROM_SESSION', 'You successfully removed a participant from the session.'),
                notifyOp(targetUserId, 'KICKED_FROM_SESSION', 'You have been removed from the session by the host.'),
            ]);
            return NextResponse.json({ checkout: 'participant_removed', removedUserId: targetUserId, pointsAwarded: points });
        }

        // Case A: host alone — end session
        if (isHost && acceptedParticipants.length === 0) {
            const points = calculateCheckoutPoints(activeSession.startTime, spaceType, occupancy, capacity);
            await prisma.$transaction([
                prisma.studySession.update({
                    where: { id: activeSession.id },
                    data: { status: 'COMPLETED', actualEndTime: new Date() },
                }),
                incrementPoints(userId, points),
                notifyOp(userId, 'CHECKOUT', 'Your session has ended. See you next time!'),
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
