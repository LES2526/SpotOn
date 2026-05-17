/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { PATCH } from '@/app/api/spaces/[spaceId]/reports/confirm/route';
import { POST } from '@/app/api/spaces/[spaceId]/reports/route';
import type { FloorPlan, Space, StudySession, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const mockRequest = (body: object) =>
    ({ json: async () => body }) as Request;

describe('Reports API', () => {
    let hostUser: User;
    let reporterUser: User;
    let acceptedParticipant: User;
    let testFloorPlan: FloorPlan;
    let testSpace: Space;
    let activeSession: StudySession;

    beforeAll(async () => {
        const leftoverFloor = await prisma.floorPlan.findFirst({
            where: { name: 'Report Test Floor' },
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
                name: 'Report Test Floor',
                floor: 95,
                imageUrl: '/test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Test Study Room',
                points: '10,20 15,20 15,25 10,25',
                capacity: 4,
                currentQrToken: `qr-${Date.now()}`,
                hasPowerOutlet: true,
            },
        });

        hostUser = await prisma.user.create({
            data: { email: `host-${Date.now()}@ualg.pt` },
        });

        reporterUser = await prisma.user.create({
            data: { email: `reporter-${Date.now()}@ualg.pt` },
        });

        acceptedParticipant = await prisma.user.create({
            data: { email: `participant-${Date.now()}@ualg.pt` },
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

        await prisma.userOnStudySession.create({
            data: {
                userId: acceptedParticipant.id,
                sessionId: activeSession.id,
            },
        });
    });

    afterEach(async () => {
        const sessions = await prisma.studySession.findMany({
            where: { spaceId: testSpace.id },
        });
        const sessionIds = sessions.map(s => s.id);

        const reportIds = (
            await prisma.report.findMany({
                where: { sessionId: { in: sessionIds } },
                select: { id: true },
            })
        ).map(r => r.id);

        await prisma.reportConfirmation.deleteMany({ where: { reportId: { in: reportIds } } });
        await prisma.report.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await prisma.userOnStudySession.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await prisma.studySession.deleteMany({ where: { spaceId: testSpace.id } });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.notification.deleteMany({
            where: { userId: { in: [hostUser.id, reporterUser.id, acceptedParticipant.id] } },
        });
        await prisma.space.delete({ where: { id: testSpace.id } });
        await prisma.floorPlan.delete({ where: { id: testFloorPlan.id } });
        await prisma.user.deleteMany({
            where: { id: { in: [hostUser.id, reporterUser.id, acceptedParticipant.id] } },
        });
        await prisma.$disconnect();
    });

    // ============================================================
    // POST /api/spaces/[spaceId]/reports
    // ============================================================

    describe('POST /api/spaces/[spaceId]/reports', () => {
        it('should return 401 if not authenticated', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Ocupado' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(401);
        });

        it('should return 404 if the space does not exist', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: 'any', reason: 'Ocupado' }),
                { params: Promise.resolve({ spaceId: 'nonexistent' }) }
            );

            expect(response.status).toBe(404);
        });

        it('should return 400 if the QR token is invalid', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: 'invalid-token', reason: 'Ocupado' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(400);
        });

        it('should return 400 if the reason is empty', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: '   ' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(400);
        });

        it('should return 400 if the host tries to report their own session', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Ocupado' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(400);
        });

        it('should return 403 if an ACCEPTED participant tries to report', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: acceptedParticipant.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Ocupado' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(403);
        });

        it('should create a report with a valid external user', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Mesa ocupada sem utilizador' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            const body = await response.json();

            expect(response.status).toBe(201);
            expect(body).toMatchObject({
                id: expect.any(String),
                reporterId: reporterUser.id,
                sessionId: activeSession.id,
                status: 'OPEN',
            });
        });

        it('should return 409 if an OPEN report already exists for the session', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            await prisma.report.create({
                data: {
                    reporterId: reporterUser.id,
                    sessionId: activeSession.id,
                    reason: 'Primeira denúncia',
                },
            });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Segunda denúncia' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(409);
        });

        it('should return 409 if the space was reported in the last 30 minutes', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            await prisma.report.create({
                data: {
                    reporterId: reporterUser.id,
                    sessionId: activeSession.id,
                    reason: 'Denúncia recente',
                    createdAt: new Date(Date.now() - 1000 * 60 * 5),
                },
            });

            await prisma.studySession.update({
                where: { id: activeSession.id },
                data: { status: 'COMPLETED', actualEndTime: new Date() },
            });

            const newSession = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: hostUser.id,
                    expectedEndTime: new Date(Date.now() + 3600000),
                    status: 'ACTIVE',
                },
            });

            activeSession = newSession;

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Nova denúncia' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(409);
        });
    });

    // ============================================================
    // PATCH /api/spaces/[spaceId]/reports/confirm
    // ============================================================

    describe('PATCH /api/spaces/[spaceId]/reports/confirm', () => {
        it('should return 401 if not authenticated', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(401);
        });

        it('should return 404 if the space does not exist', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: 'any' }),
                { params: Promise.resolve({ spaceId: 'nonexistent' }) }
            );

            expect(response.status).toBe(404);
        });

        it('should return 400 if the QR token is invalid', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: 'invalid-token' }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(400);
        });

        it('should return 403 if an external user tries to confirm', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(403);
        });

        it('should return 404 if there is no OPEN report', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(404);
        });

        it('should return 409 if the user has already confirmed', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const report = await prisma.report.create({
                data: {
                    reporterId: reporterUser.id,
                    sessionId: activeSession.id,
                    reason: 'Mesa ocupada',
                    timeToConfirm: new Date(Date.now() + 1000 * 60 * 10),
                },
            });
            await prisma.reportConfirmation.create({
                data: { reportId: report.id, userId: hostUser.id },
            });

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            expect(response.status).toBe(409);
        });

        it('should return 200 with pending status if not all participants have confirmed', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            await prisma.report.create({
                data: {
                    reporterId: reporterUser.id,
                    sessionId: activeSession.id,
                    reason: 'Mesa ocupada',
                    timeToConfirm: new Date(Date.now() + 1000 * 60 * 10),
                },
            });

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.message).toBe('Confirmation registered, waiting for others');
        });

        it('should mark the report as RESOLVED when all participants confirm', async () => {
            await prisma.report.create({
                data: {
                    reporterId: reporterUser.id,
                    sessionId: activeSession.id,
                    reason: 'Mesa ocupada',
                    timeToConfirm: new Date(Date.now() + 1000 * 60 * 10),
                },
            });

            // acceptedParticipant confirma primeiro
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: acceptedParticipant.id } });
            await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            // host confirma por último — todos confirmaram
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });
            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.status).toBe('RESOLVED');
        });

        it('should expire the report and end the session if timeToConfirm passed with no confirmations', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const report = await prisma.report.create({
                data: {
                    reporterId: reporterUser.id,
                    sessionId: activeSession.id,
                    reason: 'Mesa ocupada',
                    timeToConfirm: new Date(Date.now() - 1000 * 60 * 5),
                },
            });

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.message).toBe('Session expired, space is now free');

            const updatedReport = await prisma.report.findUnique({ where: { id: report.id } });
            expect(updatedReport?.status).toBe('EXPIRED');

            const updatedSession = await prisma.studySession.findUnique({ where: { id: activeSession.id } });
            expect(updatedSession?.status).toBe('EXPIRED');
            expect(updatedSession?.actualEndTime).toBeTruthy();
        });

        it('should expire the report but keep the session for users who confirmed (lazy expiration)', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: reporterUser.id,
                    sessionId: activeSession.id,
                    reason: 'Mesa ocupada',
                    timeToConfirm: new Date(Date.now() - 1000 * 60 * 5),
                },
            });

            // acceptedParticipant já confirmou antes da expiração
            await prisma.reportConfirmation.create({
                data: { reportId: report.id, userId: acceptedParticipant.id },
            });

            // host tenta confirmar depois da expiração
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });
            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: Promise.resolve({ spaceId: testSpace.id }) }
            );

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.message).toBe('Time expired, session continues with confirmed users');

            const updatedReport = await prisma.report.findUnique({ where: { id: report.id } });
            expect(updatedReport?.status).toBe('EXPIRED');

            // host não confirmou → novo host passa a ser o primeiro que confirmou
            const updatedSession = await prisma.studySession.findUnique({ where: { id: activeSession.id } });
            expect(updatedSession?.hostId).toBe(acceptedParticipant.id);
        });
    });
});
