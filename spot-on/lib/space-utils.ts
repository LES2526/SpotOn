import { prisma } from '@/lib/prisma';

/** Returns the space with the given ID, or null if not found. */
export async function findSpace(spaceId: string) {
    return prisma.space.findUnique({ where: { id: spaceId } });
}

/** Returns the current active session for a space, or null if none exists. */
export async function findActiveSession(spaceId: string) {
    return prisma.studySession.findFirst({
        where: { spaceId, status: 'ACTIVE' }
    });
}

/** Returns the active session hosted by a specific user in a space, or null if none. */
export async function findActiveSessionByHost(spaceId: string, hostId: string) {
    return prisma.studySession.findFirst({
        where: { spaceId, hostId, status: 'ACTIVE' }
    });
}

/** Returns the participant record for a user in a session, or null if not a participant. */
export async function isAcceptedParticipant(userId: string, sessionId: string) {
    return prisma.userOnStudySession.findFirst({ where: { userId, sessionId } });
}
