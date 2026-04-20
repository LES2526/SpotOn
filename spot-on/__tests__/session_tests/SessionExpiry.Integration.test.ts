/**
 * @fileoverview Integration tests for session expiry and expiry warning logic.
 *
 * Tests cover:
 * - markSessionExpired: marks ACTIVE session as EXPIRED
 * - sendExpiryWarning: creates in-app notification and sends email
 * - scheduleSessionExpiry: correct timer scheduling for all time scenarios
 *
 * nodemailer is mocked so no real emails are sent.
 * Prisma runs against the real test database.
 *
 * @jest-environment node
 */

jest.mock('@/lib/send-notification-email', () => ({
    sendSessionExpiringSoonEmail: jest.fn().mockResolvedValue(undefined),
}));

import type { FloorPlan, Space, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { sendSessionExpiringSoonEmail } from '@/lib/send-notification-email';
import {
    markSessionExpired,
    scheduleSessionExpiry,
    sendExpiryWarning,
} from '@/lib/session-expiry';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

describe('Session Expiry', () => {
    let testUser: User;
    let testFloorPlan: FloorPlan;
    let testSpace: Space;

    beforeAll(async () => {
        testUser = await prisma.user.create({
            data: { email: `expiry-test-${Date.now()}@ualg.pt` },
        });

        const leftover = await prisma.floorPlan.findFirst({
            where: { floor: 99 },
        });
        if (leftover) {
            await prisma.studySession.deleteMany({
                where: { space: { floorPlanId: leftover.id } },
            });
            await prisma.space.deleteMany({ where: { floorPlanId: leftover.id } });
            await prisma.floorPlan.delete({ where: { id: leftover.id } });
        }

        testFloorPlan = await prisma.floorPlan.create({
            data: {
                name: 'Expiry Test Floor',
                floor: 99,
                imageUrl: '/expiry-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Expiry Test Space',
                points: '0,0 10,0 10,10 0,10',
                capacity: 1,
                currentQrToken: `qr-expiry-${Date.now()}`,
            },
        });
    });

    afterEach(async () => {
        if (testUser) await prisma.notification.deleteMany({ where: { userId: testUser.id } });
        if (testSpace) await prisma.studySession.deleteMany({ where: { spaceId: testSpace.id } });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        if (testSpace) await prisma.space.delete({ where: { id: testSpace.id } });
        if (testFloorPlan) await prisma.floorPlan.delete({ where: { id: testFloorPlan.id } });
        if (testUser) await prisma.user.delete({ where: { id: testUser.id } });
        await prisma.$disconnect();
    });

    // -------------------------------------------------------------------------
    // markSessionExpired
    // -------------------------------------------------------------------------

    describe('markSessionExpired', () => {
        it('should mark an ACTIVE session as EXPIRED', async () => {
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 60_000),
                    status: 'ACTIVE',
                },
            });

            await markSessionExpired(session.id);

            const updated = await prisma.studySession.findUnique({
                where: { id: session.id },
            });
            expect(updated?.status).toBe('EXPIRED');
        });

        it('should not change a session that is no longer ACTIVE', async () => {
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 60_000),
                    status: 'COMPLETED',
                },
            });

            // Should not throw — the where clause with status: 'ACTIVE' simply
            // matches no record and Prisma throws P2025 which is caught internally.
            await expect(markSessionExpired(session.id)).resolves.not.toThrow();

            const unchanged = await prisma.studySession.findUnique({
                where: { id: session.id },
            });
            expect(unchanged?.status).toBe('COMPLETED');
        });
    });

    // -------------------------------------------------------------------------
    // sendExpiryWarning
    // -------------------------------------------------------------------------

    describe('sendExpiryWarning', () => {
        it('should create a SESSION_EXPIRING_SOON notification and send an email', async () => {
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 10 * 60_000),
                    status: 'ACTIVE',
                },
            });

            await sendExpiryWarning(session.id);

            // In-app notification created
            const notification = await prisma.notification.findFirst({
                where: { userId: testUser.id, type: 'SESSION_EXPIRING_SOON' },
            });
            expect(notification).not.toBeNull();
            expect(notification?.status).toBe('PENDING');

            const payload = JSON.parse(notification!.message);
            expect(payload.sessionId).toBe(session.id);
            expect(payload.spaceId).toBe(testSpace.id);

            // Email sent
            expect(sendSessionExpiringSoonEmail).toHaveBeenCalledTimes(1);
            expect(sendSessionExpiringSoonEmail).toHaveBeenCalledWith(testUser.email);
        });

        it('should not create a notification if the session is no longer ACTIVE', async () => {
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 10 * 60_000),
                    status: 'COMPLETED',
                },
            });

            await sendExpiryWarning(session.id);

            const notification = await prisma.notification.findFirst({
                where: { userId: testUser.id, type: 'SESSION_EXPIRING_SOON' },
            });
            expect(notification).toBeNull();
            expect(sendSessionExpiringSoonEmail).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // scheduleSessionExpiry
    // -------------------------------------------------------------------------

    describe('scheduleSessionExpiry', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('should mark EXPIRED immediately if the end time has already passed', async () => {
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() - 1000),
                    status: 'ACTIVE',
                },
            });

            scheduleSessionExpiry(session.id, new Date(Date.now() - 1000));

            // markSessionExpired is async — flush pending microtasks
            await jest.runAllTimersAsync();

            const updated = await prisma.studySession.findUnique({
                where: { id: session.id },
            });
            expect(updated?.status).toBe('EXPIRED');
        });

        it('should send the warning immediately if less than 10 minutes remain', async () => {
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 5 * 60_000),
                    status: 'ACTIVE',
                },
            });

            scheduleSessionExpiry(session.id, new Date(Date.now() + 5 * 60_000));

            // sendExpiryWarning called synchronously (no timer), flush microtasks
            await jest.runAllTimersAsync();

            const notification = await prisma.notification.findFirst({
                where: { userId: testUser.id, type: 'SESSION_EXPIRING_SOON' },
            });
            expect(notification).not.toBeNull();
        });

        it('should schedule the warning at T-10min when more than 10 minutes remain', async () => {
            const endTime = new Date(Date.now() + 20 * 60_000); // 20 min
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: endTime,
                    status: 'ACTIVE',
                },
            });

            scheduleSessionExpiry(session.id, endTime);

            // Advance 9 min — warning should NOT have fired yet
            jest.advanceTimersByTime(9 * 60_000);
            await Promise.resolve(); // flush microtasks

            const notifBefore = await prisma.notification.findFirst({
                where: { userId: testUser.id, type: 'SESSION_EXPIRING_SOON' },
            });
            expect(notifBefore).toBeNull();

            // Advance past the 10-min warning mark (total: 11 min elapsed)
            jest.advanceTimersByTime(2 * 60_000);
            await jest.runAllTimersAsync();

            const notifAfter = await prisma.notification.findFirst({
                where: { userId: testUser.id, type: 'SESSION_EXPIRING_SOON' },
            });
            expect(notifAfter).not.toBeNull();
        });

        it('should mark EXPIRED when the end time is reached', async () => {
            const endTime = new Date(Date.now() + 15 * 60_000);
            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: endTime,
                    status: 'ACTIVE',
                },
            });

            scheduleSessionExpiry(session.id, endTime);

            // Advance past expiry
            jest.advanceTimersByTime(16 * 60_000);
            await jest.runAllTimersAsync();

            const updated = await prisma.studySession.findUnique({
                where: { id: session.id },
            });
            expect(updated?.status).toBe('EXPIRED');
        });
    });
});
