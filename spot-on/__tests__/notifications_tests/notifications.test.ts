/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { PATCH } from '@/app/api/notifications/[id]/resolve/route';
import { GET } from '@/app/api/notifications/route';
import type { Notification, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

describe('Notifications API', () => {
    let testUser: User;
    let otherUser: User;

    beforeAll(async () => {
        testUser = await prisma.user.create({
            data: { email: `notif-user-${Date.now()}@ualg.pt` },
        });
        otherUser = await prisma.user.create({
            data: { email: `notif-other-${Date.now()}@ualg.pt` },
        });
    });

    afterEach(async () => {
        await prisma.notification.deleteMany({
            where: { userId: { in: [testUser.id, otherUser.id] } },
        });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { id: { in: [testUser.id, otherUser.id] } },
        });
        await prisma.$disconnect();
    });

    // ============================================================
    // GET /api/notifications
    // ============================================================

    describe('GET /api/notifications', () => {
        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await GET();
            expect(response.status).toBe(401);
        });

        it('deve devolver array vazio se não houver notificações pendentes', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            const response = await GET();
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(Array.isArray(body)).toBe(true);
            expect(body).toHaveLength(0);
        });

        it('deve devolver apenas notificações PENDING do utilizador', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            await prisma.notification.createMany({
                data: [
                    { userId: testUser.id, type: 'JOIN_REQUEST', message: 'Alguém quer entrar.', status: 'PENDING' },
                    { userId: testUser.id, type: 'PROOF_OF_PRESENCE', message: 'Presença questionada.', status: 'PENDING' },
                    { userId: testUser.id, type: 'JOIN_REQUEST', message: 'Já resolvida.', status: 'RESOLVED' },
                ],
            });

            const response = await GET();
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toHaveLength(2);
            expect(body.every((n: Notification) => n.status === 'PENDING')).toBe(true);
        });

        it('não deve devolver notificações de outros utilizadores', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            await prisma.notification.create({
                data: { userId: otherUser.id, type: 'JOIN_REQUEST', message: 'De outro user.', status: 'PENDING' },
            });

            const response = await GET();
            expect(response.status).toBe(200);
            const body = await response.json();
            const ownedByOther = body.find((n: Notification) => n.userId === otherUser.id);
            expect(ownedByOther).toBeUndefined();
        });
    });

    // ============================================================
    // PATCH /api/notifications/[id]/resolve
    // ============================================================

    describe('PATCH /api/notifications/[id]/resolve', () => {
        let notification: Notification;

        beforeEach(async () => {
            notification = await prisma.notification.create({
                data: { userId: testUser.id, type: 'JOIN_REQUEST', message: 'Teste.', status: 'PENDING' },
            });
        });

        it('deve devolver 401 se não autenticado', async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);

            const response = await PATCH(
                {} as Request,
                { params: Promise.resolve({ id: notification.id }) },
            );
            expect(response.status).toBe(401);
        });

        it('deve devolver 404 se a notificação não existir', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            const response = await PATCH(
                {} as Request,
                { params: Promise.resolve({ id: 'nonexistent-id' }) },
            );
            expect(response.status).toBe(404);
        });

        it('deve devolver 404 se a notificação pertencer a outro utilizador', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: otherUser.id },
            });

            const response = await PATCH(
                {} as Request,
                { params: Promise.resolve({ id: notification.id }) },
            );
            expect(response.status).toBe(404);
        });

        it('deve marcar a notificação como RESOLVED', async () => {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            const response = await PATCH(
                {} as Request,
                { params: Promise.resolve({ id: notification.id }) },
            );
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.ok).toBe(true);

            const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
            expect(updated?.status).toBe('RESOLVED');
        });
    });
});
