import { NotificationType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';

/** Calculates points awarded on checkout based on duration, space type, and occupancy ratio. */
export function calculateCheckoutPoints(startTime: Date, spaceType: string,
    occupancy: number, capacity: number): number {
    const hours = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
    if (spaceType === 'INDIVIDUAL_DESK') {
        return Math.round(100 * hours);
    }
    return Math.round((occupancy / capacity) * 100 * hours);
}

/** Returns the active session for a user in a space (as host or accepted participant). */
export async function findUserSession(spaceId: string, userId: string) {
    return prisma.studySession.findFirst({
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
}

/** Returns the most recent completed or expired session for a user in a space. */
export async function findCheckedOutSession(spaceId: string, userId: string) {
    return prisma.studySession.findFirst({
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
}

/** Returns a Prisma operation to increment a user's points — not awaited, safe inside $transaction. */
export const incrementPoints = (userId: string, points: number) =>
    prisma.user.update({
        where: { id: userId }, data: { points: { increment: points } }
    });

/** Returns a Prisma operation to remove a participant from a session — not awaited, safe inside $transaction. */
export const removeParticipantOp = (userId: string, sessionId: string) =>
    prisma.userOnStudySession.delete({
        where: { userId_sessionId: { userId, sessionId } }
    });

/** Returns a Prisma operation to create a notification — not awaited, safe inside $transaction. */
export const notifyOp = (userId: string, type: NotificationType, message: string) =>
    prisma.notification.create({ data: { userId, type, message } });
