import { NotificationType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';

//Calcula os CheckOutPoints
export function calculateCheckoutPoints(startTime: Date, spaceType: string,
    occupancy: number, capacity: number): number {
    const hours = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
    if (spaceType === 'INDIVIDUAL_DESK') {
        return Math.round(100 * hours);
    }
    return Math.round((occupancy / capacity) * 100 * hours);
}

//Querys to BD
//1.
export async function findActiveSession(spaceId: string, userId: string) {
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

//2.
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

//Return PrismaPromise (not awaited) — safe to use inside $transaction arrays
export const incrementPoints = (userId: string, points: number) =>
    prisma.user.update({
        where: { id: userId }, data: { points: { increment: points } }
    });

export const removeParticipantOp = (userId: string, sessionId: string) =>
    prisma.userOnStudySession.delete({
        where: { userId_sessionId: { userId, sessionId } }
    });

export const notifyOp = (userId: string, type: NotificationType, message: string) =>
    prisma.notification.create({ data: { userId, type, message } });
