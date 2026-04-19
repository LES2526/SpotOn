import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

type Params = { params: { spaceId: string } };

// 100 pts/hour base; group rooms scale by occupancy ratio
function calculateCheckoutPoints(startTime: Date, spaceType: string, occupancy: number, capacity: number): number {
    const hours = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
    if (spaceType === 'INDIVIDUAL_DESK') {
        return Math.round(100 * hours);
    }
    return Math.round((occupancy / capacity) * 100 * hours);
}

export async function POST(request: Request, { params }: Params) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spaceId } = params;
        const userId = session.user.id;
        const body = await request.json().catch(() => ({}));
        const { targetUserId } = body;

        // Find active session where user is host or accepted participant
        const activeSession = await prisma.studySession.findFirst({
            where: {
                spaceId,
                status: 'ACTIVE',
                expectedEndTime: { gt: new Date() },
                OR: [
                    { hostId: userId },
                    { participants: { some: { userId, status: 'ACCEPTED' } } },
                ],
            },
            include: { space: true },
        });

        // Idempotency: if no active session, check if already checked out
        if (!activeSession) {
            const alreadyCheckedOut = await prisma.studySession.findFirst({
                where: {
                    spaceId,
                    status: { in: ['COMPLETED', 'EXPIRED'] },
                    OR: [
                        { hostId: userId },
                        { participants: { some: { userId, status: 'ACCEPTED' } } },
                    ],
                },
                orderBy: { actualEndTime: 'desc' },
            });

            if (alreadyCheckedOut) {
                return NextResponse.json({ alreadyCheckedOut: true }, { status: 200 });
            }

            return NextResponse.json(
                { error: 'No active session found for this user in this space' },
                { status: 404 },
            );
        }

        const isHost = activeSession.hostId === userId;

        // Fetch accepted participants ordered by join time (oldest first)
        const acceptedParticipants = await prisma.userOnStudySession.findMany({
            where: { sessionId: activeSession.id, status: 'ACCEPTED' },
            orderBy: { joinedAt: 'asc' },
        });

        // Occupancy calculated before removal
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
                prisma.userOnStudySession.delete({
                    where: { userId_sessionId: { userId: targetUserId, sessionId: activeSession.id } },
                }),
                prisma.user.update({
                    where: { id: targetUserId },
                    data: { points: { increment: points } },
                }),
                prisma.notification.create({
                    data: { userId, type: 'KICKED_FROM_SESSION', message: 'You successfully removed a participant from the session.' },
                }),
                prisma.notification.create({
                    data: { userId: targetUserId, type: 'KICKED_FROM_SESSION', message: 'You have been removed from the session by the host.' },
                }),
            ]);

            return NextResponse.json({ checkout: 'participant_removed', removedUserId: targetUserId, pointsAwarded: points });
        }

        // Case A: host with no members — end session
        if (isHost && acceptedParticipants.length === 0) {
            const points = calculateCheckoutPoints(activeSession.startTime, spaceType, occupancy, capacity);

            await prisma.$transaction([
                prisma.studySession.update({
                    where: { id: activeSession.id },
                    data: { status: 'COMPLETED', actualEndTime: new Date() },
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: { points: { increment: points } },
                }),
                prisma.notification.create({
                    data: { userId, type: 'CHECKOUT', message: 'Your session has ended. See you next time!' },
                }),
            ]);

            return NextResponse.json({ checkout: 'session_ended', pointsAwarded: points });
        }

        // Case B1: regular member leaving — remove from session
        if (!isHost) {
            const participant = acceptedParticipants.find(p => p.userId === userId)!;
            const points = calculateCheckoutPoints(participant.joinedAt, spaceType, occupancy, capacity);

            await prisma.$transaction([
                prisma.userOnStudySession.delete({
                    where: { userId_sessionId: { userId, sessionId: activeSession.id } },
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: { points: { increment: points } },
                }),
                prisma.notification.create({
                    data: { userId, type: 'CHECKOUT', message: 'You have left the session.' },
                }),
            ]);

            return NextResponse.json({ checkout: 'member_left', pointsAwarded: points });
        }

        // Case B2: host with members — transfer leadership to next member (earliest joinedAt)
        const nextHost = acceptedParticipants[0];
        const points = calculateCheckoutPoints(activeSession.startTime, spaceType, occupancy, capacity);

        await prisma.$transaction([
            prisma.studySession.update({
                where: { id: activeSession.id },
                data: { hostId: nextHost.userId },
            }),
            prisma.userOnStudySession.delete({
                where: { userId_sessionId: { userId: nextHost.userId, sessionId: activeSession.id } },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { points: { increment: points } },
            }),
            prisma.notification.create({
                data: { userId, type: 'CHECKOUT', message: 'You have left the session.' },
            }),
            prisma.notification.create({
                data: { userId: nextHost.userId, type: 'LEADERSHIP_TRANSFERRED', message: 'You are now the host of the session.' },
            }),
        ]);

        return NextResponse.json({ checkout: 'leadership_transferred', newHostId: nextHost.userId, pointsAwarded: points });
    } catch (error) {
        console.error('Error during checkout:', error);
        return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
    }
}
