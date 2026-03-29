/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { POST } from '@/app/api/spaces/[spaceId]/sessions/route';
import { prisma } from '@/lib/prisma';
import type { FloorPlan, Space, User } from '@/app/generated/prisma';
import { getServerSession } from 'next-auth';

describe('POST /api/spaces/[spaceId]/sessions', () => {
    let testUser: User;
    let testFloorPlan: FloorPlan;
    let testSpace: Space;

    beforeAll(async () => {
        // User (não tem campo "name" no teu schema)
        testUser = await prisma.user.create({
            data: {
                email: `test-${Date.now()}@ualg.pt`,
            },
        });

        // FloorPlan obrigatório
        testFloorPlan = await prisma.floorPlan.create({
            data: {
                name: 'Test Floor',
                floor: 1,
                imageUrl: '/test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        // Space exige TODOS estes campos
        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Test Study Room',
                points: '10,20 15,20 15,25 10,25',
                capacity: 4,
                currentQrToken: `qr-${Date.now()}`, // unique obrigatório
                description: 'Integration test space',
                hasPowerOutlet: true,
            },
        });
    });

    afterEach(async () => {
        await prisma.studySession.deleteMany({
            where: { spaceId: testSpace.id },
        });

        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.studySession.deleteMany({
            where: { spaceId: testSpace.id },
        });

        await prisma.space.delete({
            where: { id: testSpace.id },
        });

        await prisma.floorPlan.delete({
            where: { id: testFloorPlan.id },
        });

        await prisma.user.delete({
            where: { id: testUser.id },
        });

        await prisma.$disconnect();
    });

    it('deve criar sessão com utilizador autenticado', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: testUser.id },
        });

        const response = await POST(
            {} as Request,
            { params: { spaceId: testSpace.id } }
        );

        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body).toMatchObject({
            id: expect.any(String),
            spaceId: testSpace.id,
            hostId: testUser.id,
            status: 'ACTIVE',
        });

        const sessionInDb = await prisma.studySession.findUnique({
            where: { id: body.id },
        });

        expect(sessionInDb).toBeTruthy();
    });

    it('deve devolver 401 se não autenticado', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const response = await POST(
            {} as Request,
            { params: { spaceId: testSpace.id } }
        );

        expect(response.status).toBe(401);
    });

    it('deve devolver 404 se o espaço não existir', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: testUser.id },
        });

        const response = await POST(
            {} as Request,
            { params: { spaceId: 'nonexistent' } }
        );

        expect(response.status).toBe(404);
    });

    it('deve devolver 409 se o espaço estiver ocupado', async () => {
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

        const response = await POST(
            {} as Request,
            { params: { spaceId: testSpace.id } }
        );

        expect(response.status).toBe(409);
    });

    it('deve permitir nova sessão se anterior estiver COMPLETED', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: testUser.id },
        });

        await prisma.studySession.create({
            data: {
                spaceId: testSpace.id,
                hostId: testUser.id,
                expectedEndTime: new Date(),
                actualEndTime: new Date(),
                status: 'COMPLETED',
            },
        });

        const response = await POST(
            {} as Request,
            { params: { spaceId: testSpace.id } }
        );

        expect(response.status).toBe(201);

        const count = await prisma.studySession.count({
            where: { spaceId: testSpace.id },
        });

        expect(count).toBe(2);
    });

    it('deve definir expectedEndTime ≈ 1 hora', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: testUser.id },
        });

        const now = Date.now();

        const response = await POST(
            {} as Request,
            { params: { spaceId: testSpace.id } }
        );

        const body = await response.json();
        const expectedEndTime = new Date(body.expectedEndTime).getTime();

        const diff = expectedEndTime - now;
        const oneHour = 3600000;

        expect(diff).toBeGreaterThanOrEqual(oneHour - 5000);
        expect(diff).toBeLessThanOrEqual(oneHour + 5000);
    });
});
