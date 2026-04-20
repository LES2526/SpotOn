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

import { createNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { sendSessionExpiringSoonEmail } from '@/lib/send-notification-email';


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
                status: 'ACTIVE',
            },
            data: { status: 'EXPIRED' },
        });
        console.log(`Session ${sessionId} marked as EXPIRED`);
    } catch (error) {
        console.error(`Failed to mark session ${sessionId} as EXPIRED:`, error);
    }
}

/**
 * Sends an in-app notification and an email warning the session host that
 * their session is about to expire. Skips silently if the session is no
 * longer ACTIVE (e.g. the user already released it).
 *
 * Both the in-app notification and the email are dispatched in parallel via
 * Promise.all to minimise latency.
 *
 * @param sessionId - The session's database ID
 */
export async function sendExpiryWarning(sessionId: string): Promise<void> {
    try {
        const session = await prisma.studySession.findUnique({
            where: { id: sessionId, status: 'ACTIVE' },
            select: {
                hostId: true, spaceId: true,
                host: {
                    select: { email: true }
                }
            },
        });
        if (!session) {
            return;
        }
        await Promise.all([
            createNotification(
                session.hostId,
                'SESSION_EXPIRING_SOON',
                JSON.stringify({
                    text: 'O teu tempo está quase a acabar! Tens 10 minutos para renovar ou libertar a mesa.',
                    sessionId,
                    spaceId: session.spaceId,
                }),
            ),
            sendSessionExpiringSoonEmail(session.host.email),
        ]);
        console.log(`Expiry warning sent for session ${sessionId}`);
    } catch (error) {
        console.error(`Failed to send expiry warning for session ${sessionId}:`, error);
    }
}

/**
 * Schedules a session to be marked as EXPIRED at its expectedEndTime.
 * Also schedules a 10-minute warning notification before expiry.
 *
 * Behaviour:
 * - If `expectedEndTime` is in the past → marks EXPIRED immediately.
 * - If less than 10 minutes remain → sends the warning immediately, then
 *   schedules expiry for the exact end time.
 * - Otherwise → schedules both the warning (at T-10 min) and the expiry.
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
    const warningDelay = delay - 10 * 60 * 1000;
    if (warningDelay > 0) {
        setTimeout(() => sendExpiryWarning(sessionId), warningDelay);
    } else {
        sendExpiryWarning(sessionId);
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
