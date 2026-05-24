/**
 * @fileoverview Session expiry utilities for Spot-On.
 *
 * Provides functions to schedule and execute session expiry using setTimeout.
 * Sessions are marked as EXPIRED when their expectedEndTime is reached.
 *
 * @module lib/session-expiry
 */

import { createNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { sendSessionExpiringSoonEmail } from '@/lib/send-notification-email';

function unrefTimer(timer: ReturnType<typeof setTimeout>) {
    timer.unref?.();
}

const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const warningTimers = new Map<string, ReturnType<typeof setTimeout>>();


/**
 * Marks a single session as EXPIRED.
 *
 * @param sessionId - The session's database ID
 */
export async function markSessionExpired(sessionId: string): Promise<void> {
    try {
        const result = await prisma.studySession.updateMany({
            where: {
                id: sessionId,
                status: 'ACTIVE',
            },
            data: { status: 'EXPIRED', actualEndTime: new Date() },
        });
        if (result.count > 0) {
            console.log(`Session ${sessionId} marked as EXPIRED`);
        }
    } catch (error) {
        console.error(`Failed to mark session ${sessionId} as EXPIRED:`, error);
    }
}


/**
 * Sends an in-app notification and an email warning the session host that
 * their session is about to expire. Skips silently if the session is no
 * longer ACTIVE (e.g. the user already released it).
 *
 * @param sessionId - The session's database ID
 */
export async function sendExpiryWarning(sessionId: string): Promise<void> {
    try {
        const session = await prisma.studySession.findUnique({
            where: { id: sessionId },
            select: {
                status: true,
                hostId: true,
                spaceId: true,
                host: { select: { email: true } },
            },
        });
        if (!session || session.status === 'COMPLETED' || session.status === 'EXPIRED') {
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
 * @param sessionId       - The session's database ID
 * @param expectedEndTime - The time at which the session should expire
 */
export function scheduleSessionExpiry(sessionId: string, expectedEndTime: Date): void {
    // Cancel any existing timers for this session (e.g. after an extend)
    const prevWarning = warningTimers.get(sessionId);
    if (prevWarning) { clearTimeout(prevWarning); warningTimers.delete(sessionId); }
    const prevExpiry = expiryTimers.get(sessionId);
    if (prevExpiry) { clearTimeout(prevExpiry); expiryTimers.delete(sessionId); }

    const delay = expectedEndTime.getTime() - Date.now();
    if (delay <= 0) {
        console.log(`Session ${sessionId} already expired, marking EXPIRED immediately`);
        const timer = setTimeout(() => markSessionExpired(sessionId), 0);
        unrefTimer(timer);
        return;
    }

    console.log(`Session ${sessionId} scheduled to expire in ${Math.round(delay / 1000)}s`);

    const warningDelay = delay - 10 * 60 * 1000;
    if (warningDelay > 0) {
        const warningTimer = setTimeout(() => {
            sendExpiryWarning(sessionId);
            warningTimers.delete(sessionId);
        }, warningDelay);
        unrefTimer(warningTimer);
        warningTimers.set(sessionId, warningTimer);
    } else {
        const warningTimer = setTimeout(() => {
            sendExpiryWarning(sessionId);
            warningTimers.delete(sessionId);
        }, 0);
        unrefTimer(warningTimer);
        warningTimers.set(sessionId, warningTimer);
    }

    const expiryTimer = setTimeout(() => {
        markSessionExpired(sessionId);
        expiryTimers.delete(sessionId);
    }, delay);
    unrefTimer(expiryTimer);
    expiryTimers.set(sessionId, expiryTimer);
}


/**
 * Restores expiry timers for all active sessions on server startup.
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
