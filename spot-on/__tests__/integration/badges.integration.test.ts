/**
 * @jest-environment node
 */

/**
 * @fileoverview Integration tests for POST /api/user/[id]/badge.
 *
 * Tests badge awarding via HTTP using fetch against a running Next.js dev server.
 *
 * Requires the app and database to be running before executing:
 * `docker compose up` then `npm test`
 *
 * @module __tests__/badge_tests/badge.Integration.test
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

jest.setTimeout(15000);

interface Client {
    post: (path: string, body: object) => Promise<{ status: number; data: any }>;
}

function createClient(headers: Record<string, string> = {}): Client {
    return {
        post: async (path, body) => {
            const res = await fetch(`${BASE_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => null);
            return { status: res.status, data };
        },
    };
}

async function createAuthenticatedClient(userId: string): Promise<{ client: Client; sessionToken: string }> {
    const sessionToken = `test-session-${userId}-${Date.now()}`;

    await prisma.session.create({
        data: {
            sessionToken,
            userId,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });

    const client = createClient({ Cookie: `next-auth.session-token=${sessionToken}` });

    return { client, sessionToken };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

describe('POST /api/user/[id]/badge', () => {
    let userId: string;
    let badgeId: string;
    let sessionToken: string;
    let client: Client;
    let unauthClient: Client;

    const timestamp = Date.now();

    beforeAll(async () => {
        unauthClient = createClient();

        const user = await prisma.user.create({
            data: { email: `badges-test-${timestamp}@ualg.pt` },
        });
        userId = user.id;

        const badge = await prisma.badge.create({
            data: {
                name: `Test Badge ${timestamp}`,
                description: 'A badge for integration testing',
                iconUrl: '/badge/test.png',
                month: 0,
                year: 0,
            },
        });
        badgeId = badge.id;

        ({ client, sessionToken } = await createAuthenticatedClient(userId));
    });

    afterEach(async () => {
        await prisma.userBadge.deleteMany({ where: { userId } });
    });

    afterAll(async () => {
        await prisma.userBadge.deleteMany({ where: { userId } });
        await prisma.badge.delete({ where: { id: badgeId } });
        await prisma.session.deleteMany({ where: { sessionToken } });
        await prisma.user.delete({ where: { id: userId } });
        await prisma.$disconnect();
    });

    // -----------------------------------------------------------------------
    // Authentication
    // -----------------------------------------------------------------------

    describe('Authentication', () => {
        it('should return 401 when user is not authenticated', async () => {
            const { status } = await unauthClient.post(`/api/user/${userId}/badge`, { badgeId });
            expect(status).toBe(401);
        });
    });

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    describe('Validation', () => {
        it('should return 400 when badgeId is missing', async () => {
            const { status, data } = await client.post(`/api/user/${userId}/badge`, {});
            expect(status).toBe(400);
            expect(data.error).toBeDefined();
        });

        it('should return 404 when user does not exist', async () => {
            const { status, data } = await client.post(`/api/user/nonexistent-user-id/badge`, { badgeId });
            expect(status).toBe(404);
            expect(data.error).toMatch(/user not found/i);
        });

        it('should return 404 when badge does not exist', async () => {
            const { status, data } = await client.post(`/api/user/${userId}/badge`, {
                badgeId: 'nonexistent-badge-id',
            });
            expect(status).toBe(404);
            expect(data.error).toMatch(/badge not found/i);
        });
    });

    // -----------------------------------------------------------------------
    // Badge awarding
    // -----------------------------------------------------------------------

    describe('Badge awarding', () => {
        it('should award a badge and return 201', async () => {
            const { status, data } = await client.post(`/api/user/${userId}/badge`, { badgeId });
            expect(status).toBe(201);
            expect(data).toMatchObject({
                userId,
                badgeId,
            });
        });

        it('should persist the badge in the database', async () => {
            await client.post(`/api/user/${userId}/badge`, { badgeId });

            const userBadge = await prisma.userBadge.findUnique({
                where: { userId_badgeId: { userId, badgeId } },
            });
            expect(userBadge).toBeTruthy();
            expect(userBadge?.userId).toBe(userId);
            expect(userBadge?.badgeId).toBe(badgeId);
        });

        it('should set awardedAt to approximately now', async () => {
            const before = Date.now() - 5000; // 5s buffer for clock skew
            await client.post(`/api/user/${userId}/badge`, { badgeId });

            const userBadge = await prisma.userBadge.findUnique({
                where: { userId_badgeId: { userId, badgeId } },
            });

            expect(userBadge?.awardedAt.getTime()).toBeGreaterThanOrEqual(before);
            expect(userBadge?.awardedAt.getTime()).toBeLessThanOrEqual(Date.now() + 5000);
        });

        it('should return 409 when user already has the badge', async () => {
            await client.post(`/api/user/${userId}/badge`, { badgeId });

            const { status, data } = await client.post(`/api/user/${userId}/badge`, { badgeId });
            expect(status).toBe(409);
            expect(data.error).toMatch(/already has this badge/i);
        });

        it('should allow awarding different badges to the same user', async () => {
            const secondBadge = await prisma.badge.create({
                data: {
                    name: `Second Test Badge ${timestamp}`,
                    description: 'A second badge for integration testing',
                    iconUrl: '/badge/test2.png',
                    month: 0,
                    year: 0,
                },
            });

            const { status: status1 } = await client.post(`/api/user/${userId}/badge`, { badgeId });
            const { status: status2 } = await client.post(`/api/user/${userId}/badge`, {
                badgeId: secondBadge.id,
            });

            expect(status1).toBe(201);
            expect(status2).toBe(201);

            const userBadges = await prisma.userBadge.findMany({ where: { userId } });
            expect(userBadges.length).toBe(2);

            await prisma.userBadge.deleteMany({ where: { badgeId: secondBadge.id } });
            await prisma.badge.delete({ where: { id: secondBadge.id } });
        });
    });
});