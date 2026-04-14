/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { GET } from '@/app/api/spaces/[spaceId]/reports/active/route';
import type { FloorPlan, Space, StudySession, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

describe('GET /api/spaces/[spaceId]/reports/active', () => {
    let hostUser: User;
    let testFloorPlan: FloorPlan;
    let testSpace: Space;
    let activeSession: StudySession;

    beforeAll(async () => {
        hostUser = await prisma.user.create({
            data: { email: `report-active-host-${Date.now()}@ualg.pt` },
        });

        const leftoverFloor = await prisma.floorPlan.findFirst({
            where: { name: 'Report Active Floor' },
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
                name: 'Report Active Floor',
                floor: 96,
                imageUrl: '/report-active.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Report Active Space',
                points: '10,20 15,20 15,25 10,25',
                capacity: 4,
                currentQrToken: `qr-report-active-${Date.now()}`,
                description: 'Integration test space for active report',
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
        const sessions = await prisma.studySession.findMany({
            where: { spaceId: testSpace.id },
            select: { id: true },
        });
        const ids = sessions.map(s => s.id);
        const reportIds = (
            await prisma.report.findMany({ where: { sessionId: { in: ids } }, select: { id: true } })
        ).map(r => r.id);
        await prisma.reportConfirmation.deleteMany({ where: { reportId: { in: reportIds } } });
        await prisma.report.deleteMany({ where: { sessionId: { in: ids } } });
        await prisma.studySession.deleteMany({ where: { spaceId: testSpace.id } });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.space.delete({ where: { id: testSpace.id } });
        await prisma.floorPlan.delete({ where: { id: testFloorPlan.id } });
        await prisma.user.delete({ where: { id: hostUser.id } });
        await prisma.$disconnect();
    });

    it('deve devolver 401 se não autenticado', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const response = await GET({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
        expect(response.status).toBe(401);
    });

    it('deve devolver 404 se o espaço não existir', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

        const response = await GET({} as Request, { params: Promise.resolve({ spaceId: 'nonexistent' }) });
        expect(response.status).toBe(404);
    });

    it('deve devolver report: null se o utilizador não tiver sessão ativa no espaço', async () => {
        const otherUser = await prisma.user.create({
            data: { email: `no-session-user-${Date.now()}@ualg.pt` },
        });

        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: otherUser.id } });

        const response = await GET({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.report).toBeNull();

        await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('deve devolver report: null se não houver report aberto para a sessão', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

        const response = await GET({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.report).toBeNull();
    });

    it('deve devolver o report OPEN da sessão do utilizador', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: hostUser.id } });

        const reporter = await prisma.user.create({
            data: { email: `reporter-active-${Date.now()}@ualg.pt` },
        });

        const report = await prisma.report.create({
            data: {
                reporterId: reporter.id,
                sessionId: activeSession.id,
                reason: 'Ausente do lugar',
                status: 'OPEN',
            },
        });

        const response = await GET({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.report).not.toBeNull();
        expect(body.report.id).toBe(report.id);
        expect(body.report.status).toBe('OPEN');

        await prisma.report.delete({ where: { id: report.id } });
        await prisma.user.delete({ where: { id: reporter.id } });
    });
});
