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
import { prisma } from '@/lib/prisma';
import type { FloorPlan, Space, StudySession, User } from '@prisma/client';
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
        testFloorPlan = await prisma.floorPlan.create({
            data: {
                name: 'Test Floor',
                floor: 1,
                imageUrl: '/test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Test Study Room',
                posX: 10,
                posY: 20,
                width: 5,
                height: 5,
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
                status: 'ACCEPTED',
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
        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Ocupado' }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(401);
        });

        it('deve devolver 404 se o espaço não existir', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: 'any', reason: 'Ocupado' }),
                { params: { spaceId: 'nonexistent' } }
            );

            expect(response.status).toBe(404);
        });

        it('deve devolver 400 se o QR token for inválido', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: 'invalid-token', reason: 'Ocupado' }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(400);
        });

        it('deve devolver 400 se o reason estiver vazio', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: '   ' }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(400);
        });

        it('deve devolver 400 se o host tentar denunciar a própria sessão', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Ocupado' }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(400);
        });

        it('deve devolver 403 se participante ACCEPTED tentar denunciar', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: acceptedParticipant.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Ocupado' }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(403);
        });

        it('deve criar denúncia com utilizador externo válido', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await POST(
                mockRequest({ qrToken: testSpace.currentQrToken, reason: 'Mesa ocupada sem utilizador' }),
                { params: { spaceId: testSpace.id } }
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

        it('deve devolver 409 se já existir denúncia OPEN para a sessão', async () => {
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
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(409);
        });

        it('deve devolver 409 se o espaço foi denunciado nos últimos 30 minutos', async () => {
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
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(409);
        });
    });

    // ============================================================
    // PATCH /api/spaces/[spaceId]/reports/confirm
    // ============================================================

    describe('PATCH /api/spaces/[spaceId]/reports/confirm', () => {
        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(401);
        });

        it('deve devolver 404 se o espaço não existir', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: 'any' }),
                { params: { spaceId: 'nonexistent' } }
            );

            expect(response.status).toBe(404);
        });

        it('deve devolver 400 se o QR token for inválido', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: 'invalid-token' }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(400);
        });

        it('deve devolver 403 se utilizador externo tentar confirmar', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: reporterUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(403);
        });

        it('deve devolver 404 se não existir denúncia OPEN', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(404);
        });

        it('deve devolver 409 se utilizador já confirmou', async () => {
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
                { params: { spaceId: testSpace.id } }
            );

            expect(response.status).toBe(409);
        });

        it('deve devolver 200 com pending se nem todos confirmaram', async () => {
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
                { params: { spaceId: testSpace.id } }
            );

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.message).toBe('Confirmation registered, waiting for others');
        });

        it('deve marcar denúncia como RESOLVED quando todos os participantes confirmam', async () => {
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
                { params: { spaceId: testSpace.id } }
            );

            // host confirma por último — todos confirmaram
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });
            const response = await PATCH(
                mockRequest({ qrToken: testSpace.currentQrToken }),
                { params: { spaceId: testSpace.id } }
            );

            const body = await response.json();
            expect(response.status).toBe(200);
            expect(body.status).toBe('RESOLVED');
        });

        it('deve expirar denúncia e encerrar sessão se timeToConfirm passou sem confirmações', async () => {
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
                { params: { spaceId: testSpace.id } }
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

        it('deve expirar denúncia mas manter sessão com utilizadores que confirmaram (lazy expiration)', async () => {
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
                { params: { spaceId: testSpace.id } }
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
