import { prisma } from '@/lib/prisma';

export async function findSpace(spaceId: string) {
    return prisma.space.findUnique({ where: { id: spaceId } });
}

export async function findActiveSession(spaceId: string) {
    return prisma.studySession.findFirst({
        where: { spaceId, status: 'ACTIVE' }
    });
}

export async function findActiveSessionByHost(spaceId: string, hostId: string) {
    return prisma.studySession.findFirst({
        where: { spaceId, hostId, status: 'ACTIVE' }
    });
}

export async function isAcceptedParticipant(userId: string, sessionId: string) {
    return prisma.userOnStudySession.findFirst({
        where: { userId, sessionId, status: 'ACCEPTED' }
    });
}
