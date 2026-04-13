/**
 * @fileoverview Session expiry utilities for Spot-On.
 *
 * Provides functions to schedule and execute session expiry using setTimeout.
 * Sessions are marked as EXPIRED when their expectedEndTime is reached.
 *
 * @module lib/session-expiry
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';

/**
 * Marks a single session as EXPIRED.
 *
 * @param sessionId - The session's database ID
 */
export async function markSessionExpired(sessionId: string): Promise<void> {
    try {
        await prisma.studySession.update({
            where: {
                id: sessionId,
                status: 'ACTIVE', // only update if still ACTIVE (user may have released it early)
            },
            data: { status: 'EXPIRED' },
        });
        console.log(`Session ${sessionId} marked as EXPIRED`);
    } catch (error) {
        console.error(`Failed to mark session ${sessionId} as EXPIRED:`, error);
    }
}

/**
 * Schedules a session to be marked as EXPIRED at its expectedEndTime.
 *
 * If the expectedEndTime is in the past, the session is marked EXPIRED immediately.
 * If it is in the future, a setTimeout is scheduled for the exact moment it expires.
 *
 * @param sessionId       - The session's database ID
 * @param expectedEndTime - The time at which the session should expire
 */
export function scheduleSessionExpiry(sessionId: string, expectedEndTime: Date): void {
    const delay = expectedEndTime.getTime() - Date.now();

    if (delay <= 0) {
        // Already expired — mark EXPIRED immediately
        console.log(`Session ${sessionId} already expired, marking EXPIRED immediately`);
        markSessionExpired(sessionId);
        return;
    }

    console.log(`Session ${sessionId} scheduled to expire in ${Math.round(delay / 1000)}s`);
    setTimeout(() => markSessionExpired(sessionId), delay);
}

/**
 * Restores expiry timers for all active sessions on server startup.
 *
 * Queries all ACTIVE sessions and schedules a setTimeout for each one.
 * Sessions whose expectedEndTime has already passed are marked EXPIRED immediately.
 *
 * Should be called once on server startup via instrumentation.ts.
 */
export async function restoreSessionExpiries(): Promise<void> {

    try {
        const activeSessions = await prisma.studySession.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, expectedEndTime: true },
        });

        console.log(`Restoring expiry timers for ${activeSessions.length} active session(s)`);

        for (const session of activeSessions) {
            scheduleSessionExpiry(session.id, session.expectedEndTime);
        }

    } catch (error) {
        console.error('Failed to restore session expiries:', error);
    }
}