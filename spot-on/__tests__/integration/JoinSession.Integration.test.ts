/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

jest.mock('@/lib/send-notification-email', () => ({
    sendJoinRequestEmail: jest.fn().mockResolvedValue(undefined),
    sendApprovedJoinRequestEmail: jest.fn().mockResolvedValue(undefined),
}));

import { PATCH } from '@/app/api/spaces/[spaceId]/sessions/join-session/approved/route';
import { POST } from '@/app/api/spaces/[spaceId]/sessions/join-session/route';
import type { FloorPlan, Space, StudySession, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const mockRequest = (body: object) =>
    ({ json: async () => body }) as Request;

describe('Join Session API', () => {
    let hostUser: User;
    let requesterUser: User;
    let testFloorPlan: FloorPlan;
    let testSpace: Space;
    let activeSession: StudySession;

    beforeAll(async () => {
        hostUser = await prisma.user.create({
            data: { email: `join-host-${Date.now()}@ualg.pt` },
        });
        requesterUser = await prisma.user.create({
            data: { email: `join-requester-${Date.now()}@ualg.pt` },
        });

        const leftoverFloor = await prisma.floorPlan.findFirst({
            where: { name: 'Join Floor' },
        });
        if (leftoverFloor) {
            await prisma.studySession.deleteMany({
                where: { space: { floorPlanId: leftoverFloor.id } },
            });
            await prisma.space.deleteMany({ where: { floorPlanId: leftoverFloor.id } });
            await prisma.floorPlan.delete({ where: { id: leftoverFloor.id } });
        }

        testFloorPlan = await prisma.floorPlan.create({
            data: {
                name: 'Join Floor',
                floor: 94,
                imageUrl: '/join-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Join Test Space',
                points: '10,20 15,20 15,25 10,25',
                capacity: 4,
                currentQrToken: `qr-join-${Date.now()}`,
                description: 'Integration test space for join session',
                hasPowerOutlet: true,
            },
        });
    });

    beforeEach(async () => {
        activeSession = await prisma.studySession.create({
            data: {
                spaceId: testSpace.id,
                hostId: hostUser.id,
                expectedEndTime: new Date(Date.now() + 3600000),
                status: 'ACTIVE',
            },
        });
    });

    afterEach(async () => {
        await prisma.notification.deleteMany({ where: { userId: hostUser.id } });
        await prisma.userOnStudySession.deleteMany({ where: { sessionId: activeSession.id } });
        await prisma.studySession.deleteMany({ where: { spaceId: testSpace.id } });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.space.delete({ where: { id: testSpace.id } });
        await prisma.floorPlan.delete({ where: { id: testFloorPlan.id } });
        await prisma.user.deleteMany({
            where: { id: { in: [hostUser.id, requesterUser.id] } },
        });
        await prisma.$disconnect();
    });

    // ============================================================
    // POST /api/spaces/[spaceId]/sessions/join-session
    // ============================================================

    describe('POST /api/spaces/[spaceId]/sessions/join-session', () => {
        it('should return 401 if not authenticated', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await POST({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(401);
        });

        it('should return 404 if the space does not exist', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            const response = await POST({} as Request, { params: Promise.resolve({ spaceId: 'nonexistent' }) });
            expect(response.status).toBe(404);
        });

        it('should return 409 if the user is already host of an active session', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: hostUser.id, email: hostUser.email },
            });

            const response = await POST({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(409);
        });

        it('should return 409 if the user already has a pending join request', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            await prisma.userOnStudySession.create({
                data: { userId: requesterUser.id, sessionId: activeSession.id, status: 'PENDING' },
            });

            const response = await POST({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(409);
        });

        it('should create a PENDING join request and notify the host', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            const response = await POST({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(201);
            const body = await response.json();
            expect(body.userId).toBe(requesterUser.id);
            expect(body.sessionId).toBe(activeSession.id);
            expect(body.status).toBe('PENDING');

            const notif = await prisma.notification.findFirst({
                where: { userId: hostUser.id, type: 'JOIN_REQUEST', status: 'PENDING' },
            });
            expect(notif).not.toBeNull();
        });
    });

    // ============================================================
    // PATCH /api/spaces/[spaceId]/sessions/join-session/approved
    // ============================================================

    describe('PATCH /api/spaces/[spaceId]/sessions/join-session/approved', () => {
        beforeEach(async () => {
            await prisma.userOnStudySession.create({
                data: { userId: requesterUser.id, sessionId: activeSession.id, status: 'PENDING' },
            });
        });

        it('should return 401 if not authenticated', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await PATCH(
                mockRequest({ userId: requesterUser.id }),
                { params: Promise.resolve({ spaceId: testSpace.id }) },
            );
            expect(response.status).toBe(401);
        });

        it('should return 404 if the space does not exist', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: hostUser.id },
            });

            const response = await PATCH(
                mockRequest({ userId: requesterUser.id }),
                { params: Promise.resolve({ spaceId: 'nonexistent' }) },
            );
            expect(response.status).toBe(404);
        });

        it('should return 403 if the user is not the host', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id },
            });

            const response = await PATCH(
                mockRequest({ userId: requesterUser.id }),
                { params: Promise.resolve({ spaceId: testSpace.id }) },
            );
            expect(response.status).toBe(403);
        });

        it('should approve the request and mark it as ACCEPTED', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: hostUser.id },
            });

            const response = await PATCH(
                mockRequest({ userId: requesterUser.id }),
                { params: Promise.resolve({ spaceId: testSpace.id }) },
            );
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.status).toBe('ACCEPTED');

            const entry = await prisma.userOnStudySession.findFirst({
                where: { userId: requesterUser.id, sessionId: activeSession.id },
            });
            expect(entry?.status).toBe('ACCEPTED');
        });
    });
});
