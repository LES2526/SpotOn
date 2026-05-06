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

jest.mock('@/lib/qr-utils', () => ({
    verifyQrCode: jest.fn().mockReturnValue({ valid: true, spaceId: 'any', window: 1 }),
}));

import { PATCH } from '@/app/api/spaces/[spaceId]/sessions/join-session/approved/route';
import { POST } from '@/app/api/spaces/[spaceId]/sessions/join-session/route';
import type { FloorPlan, Space, StudySession, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { verifyQrCode } from '@/lib/qr-utils';
import { getServerSession } from 'next-auth';

const mockRequest = (body: object) =>
    ({ json: async () => ({ qrWindow: 1, sig: 'valid', ...body }) }) as Request;

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
        await prisma.joinRequest.deleteMany({ where: { studySessionId: activeSession.id } });
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
        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(401);
        });

        it('deve devolver 404 se o espaço não existir', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: 'nonexistent' }) });
            expect(response.status).toBe(404);
        });

        it('deve devolver 409 se o utilizador já for host de uma sessão ativa', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: hostUser.id, email: hostUser.email },
            });

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(409);
        });

        it('deve devolver 409 se o utilizador já tiver um pedido ativo', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            await prisma.joinRequest.create({
                data: { userId: requesterUser.id, studySessionId: activeSession.id, spaceId: testSpace.id, status: 'PENDING' },
            });

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(409);
        });

        it('deve criar pedido de entrada com status PENDING e notificar o host', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(201);
            const body = await response.json();
            expect(body.userId).toBe(requesterUser.id);
            expect(body.studySessionId).toBe(activeSession.id);
            expect(body.status).toBe('PENDING');

            const notif = await prisma.notification.findFirst({
                where: { userId: hostUser.id, type: 'JOIN_REQUEST', status: 'PENDING' },
            });
            expect(notif).not.toBeNull();
        });

        it('deve devolver 403 se o QR Code for inválido', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });
            (verifyQrCode as jest.Mock).mockReturnValueOnce({ valid: false, reason: 'invalid_signature' });

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(403);
        });

        it('deve devolver 409 se a sessão estiver cheia', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            const fullSpace = await prisma.space.create({
                data: {
                    floorPlanId: testFloorPlan.id,
                    name: 'Full Space',
                    points: '0,0 1,0 1,1 0,1',
                    capacity: 1,
                    currentQrToken: `qr-full-${Date.now()}`,
                },
            });
            const fullSession = await prisma.studySession.create({
                data: {
                    spaceId: fullSpace.id,
                    hostId: hostUser.id,
                    expectedEndTime: new Date(Date.now() + 3600000),
                    status: 'ACTIVE',
                },
            });

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: fullSpace.id }) });
            expect(response.status).toBe(409);

            await prisma.studySession.delete({ where: { id: fullSession.id } });
            await prisma.space.delete({ where: { id: fullSpace.id } });
        });

        it('deve devolver 429 se o utilizador exceder o limite de pedidos', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id, email: requesterUser.email },
            });

            await prisma.joinRequest.createMany({
                data: [
                    { userId: requesterUser.id, studySessionId: activeSession.id, spaceId: testSpace.id, status: 'REJECTED' },
                    { userId: requesterUser.id, studySessionId: activeSession.id, spaceId: testSpace.id, status: 'REJECTED' },
                    { userId: requesterUser.id, studySessionId: activeSession.id, spaceId: testSpace.id, status: 'REJECTED' },
                ],
            });

            const response = await POST(mockRequest({}), { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(429);
        });
    });

    // ============================================================
    // PATCH /api/spaces/[spaceId]/sessions/join-session/approved
    // ============================================================

    describe('PATCH /api/spaces/[spaceId]/sessions/join-session/approved', () => {
        beforeEach(async () => {
            await prisma.joinRequest.create({
                data: { userId: requesterUser.id, studySessionId: activeSession.id, spaceId: testSpace.id, status: 'PENDING' },
            });
        });

        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await PATCH(
                mockRequest({ userId: requesterUser.id }),
                { params: Promise.resolve({ spaceId: testSpace.id }) },
            );
            expect(response.status).toBe(401);
        });

        it('deve devolver 404 se o espaço não existir', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: hostUser.id },
            });

            const response = await PATCH(
                mockRequest({ userId: requesterUser.id }),
                { params: Promise.resolve({ spaceId: 'nonexistent' }) },
            );
            expect(response.status).toBe(404);
        });

        it('deve devolver 403 se o utilizador não for o host', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: requesterUser.id },
            });

            const response = await PATCH(
                mockRequest({ userId: requesterUser.id }),
                { params: Promise.resolve({ spaceId: testSpace.id }) },
            );
            expect(response.status).toBe(403);
        });

        it('deve aprovar o pedido e marcar como ACCEPTED', async () => {
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
            expect(entry).not.toBeNull();
        });
    });
});
