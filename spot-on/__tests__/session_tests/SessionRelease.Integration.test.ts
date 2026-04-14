/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { DELETE, PATCH } from '@/app/api/spaces/[spaceId]/sessions/route';
import type { FloorPlan, Space, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

describe('Sessions route – DELETE & PATCH', () => {
    let testUser: User;
    let testFloorPlan: FloorPlan;
    let testSpace: Space;

    beforeAll(async () => {
        testUser = await prisma.user.create({
            data: { email: `session-rel-${Date.now()}@ualg.pt` },
        });

        const leftoverFloor = await prisma.floorPlan.findFirst({
            where: { name: 'Release Floor' },
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
                name: 'Release Floor',
                floor: 93,
                imageUrl: '/release-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Release Test Space',
                points: '10,20 15,20 15,25 10,25',
                capacity: 4,
                currentQrToken: `qr-release-${Date.now()}`,
                description: 'Integration test space for release/update',
                hasPowerOutlet: true,
            },
        });
    });

    afterEach(async () => {
        await prisma.studySession.deleteMany({ where: { spaceId: testSpace.id } });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.studySession.deleteMany({ where: { spaceId: testSpace.id } });
        await prisma.space.delete({ where: { id: testSpace.id } });
        await prisma.floorPlan.delete({ where: { id: testFloorPlan.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
        await prisma.$disconnect();
    });

    // ============================================================
    // DELETE /api/spaces/[spaceId]/sessions
    // ============================================================

    describe('DELETE /api/spaces/[spaceId]/sessions', () => {
        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await DELETE({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(401);
        });

        it('deve devolver 404 se não houver sessão ativa para o utilizador', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            const response = await DELETE({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(404);
        });

        it('deve marcar a sessão como COMPLETED e definir actualEndTime', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            const session = await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 3600000),
                    status: 'ACTIVE',
                },
            });

            const response = await DELETE({} as Request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.success).toBe(true);

            const updated = await prisma.studySession.findUnique({ where: { id: session.id } });
            expect(updated?.status).toBe('COMPLETED');
            expect(updated?.actualEndTime).toBeTruthy();
        });
    });

    // ============================================================
    // PATCH /api/spaces/[spaceId]/sessions (update expected end time)
    // ============================================================

    describe('PATCH /api/spaces/[spaceId]/sessions', () => {
        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const request = new Request('http://localhost', {
                method: 'PATCH',
                body: JSON.stringify({ expectedEndTime: new Date(Date.now() + 7200000).toISOString() }),
            });

            const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(401);
        });

        it('deve devolver 404 se não houver sessão ativa', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            const request = new Request('http://localhost', {
                method: 'PATCH',
                body: JSON.stringify({ expectedEndTime: new Date(Date.now() + 7200000).toISOString() }),
            });

            const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(404);
        });

        it('deve devolver 400 se expectedEndTime for no passado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 3600000),
                    status: 'ACTIVE',
                },
            });

            const request = new Request('http://localhost', {
                method: 'PATCH',
                body: JSON.stringify({ expectedEndTime: new Date(Date.now() - 1000).toISOString() }),
            });

            const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(400);
        });

        it('deve atualizar o expectedEndTime com sucesso', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            await prisma.studySession.create({
                data: {
                    spaceId: testSpace.id,
                    hostId: testUser.id,
                    expectedEndTime: new Date(Date.now() + 3600000),
                    status: 'ACTIVE',
                },
            });

            const newEndTime = new Date(Date.now() + 7200000);

            const request = new Request('http://localhost', {
                method: 'PATCH',
                body: JSON.stringify({ expectedEndTime: newEndTime.toISOString() }),
            });

            const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.id).toBeDefined();
            expect(body.status).toBe('ACTIVE');
        });
    });
});
