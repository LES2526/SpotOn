/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { GET } from '@/app/api/leaderboard/route';
import type { User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

describe('GET /api/leaderboard', () => {
    let userA: User;
    let userB: User;
    let userC: User;

    beforeAll(async () => {
        userA = await prisma.user.create({
            data: { email: `leaderboard-a-${Date.now()}@ualg.pt`, points: 100 },
        });

        userB = await prisma.user.create({
            data: { email: `leaderboard-b-${Date.now()}@ualg.pt`, points: 300 },
        });

        userC = await prisma.user.create({
            data: { email: `leaderboard-c-${Date.now()}@ualg.pt`, points: 200 },
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { id: { in: [userA.id, userB.id, userC.id] } },
        });

        await prisma.$disconnect();
    });

    it('should return 401 if not authenticated', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const response = await GET({} as Request);

        expect(response.status).toBe(401);
    });

    it('should return 200 with the list sorted by points descending', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: userA.id },
        });

        const response = await GET({} as Request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);

        // Encontrar as posições dos utilizadores de teste na leaderboard
        const entryA = body.find((e: { id: string }) => e.id === userA.id);
        const entryB = body.find((e: { id: string }) => e.id === userB.id);
        const entryC = body.find((e: { id: string }) => e.id === userC.id);

        expect(entryA).toBeDefined();
        expect(entryB).toBeDefined();
        expect(entryC).toBeDefined();

        // B (300pts) > C (200pts) > A (100pts)
        expect(entryB.rank).toBeLessThan(entryC.rank);
        expect(entryC.rank).toBeLessThan(entryA.rank);
    });

    it('each entry should have the correct fields', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: userA.id },
        });

        const response = await GET({} as Request);
        const body = await response.json();

        expect(response.status).toBe(200);

        const entry = body[0];
        expect(entry).toMatchObject({
            rank: expect.any(Number),
            id: expect.any(String),
            email: expect.any(String),
            points: expect.any(Number),
        });
    });
});
