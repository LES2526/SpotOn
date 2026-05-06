/**
 * @jest-environment node
 */

/**
 * @fileoverview Integration tests for POST /api/qrcode/verify.
 *
 * Tests the HMAC-based QR code verification and session creation endpoint
 * via HTTP using fetch against a running Next.js dev server.
 *
 * Requires the app and database to be running before executing:
 * `docker compose up` then `npm test`
 *
 * @module __tests__/qrcode_tests/QRCode.Integration.test
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { currentWindow, generateSignature, previousWindow } from '@/lib/qr-utils';

// ---------------------------------------------------------------------------
// Fetch setup
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
const ENDPOINT = '/api/qrcode/verify';

jest.setTimeout(30000);

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

/**
 * Creates a fetch client authenticated as the given user by injecting
 * a real database session and passing its token as a cookie.
 */
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

describe('POST /api/qrcode/verify', () => {
    let userId: string;
    let floorPlanId: string;
    let spaceId: string;
    let sessionToken: string;
    let client: Client;
    let unauthClient: Client;

    beforeAll(async () => {
        unauthClient = createClient();

        const user = await prisma.user.create({
            data: { email: `qr-verify-${Date.now()}@ualg.pt` },
        });
        userId = user.id;

        const leftoverFloor = await prisma.floorPlan.findFirst({
            where: { name: 'QR Verify Test Floor' },
        });
        if (leftoverFloor) {
            await prisma.studySession.deleteMany({
                where: { space: { floorPlanId: leftoverFloor.id } },
            });
            await prisma.space.deleteMany({ where: { floorPlanId: leftoverFloor.id } });
            await prisma.floorPlan.delete({ where: { id: leftoverFloor.id } });
        }

        const floorPlan = await prisma.floorPlan.create({
            data: {
                name: 'QR Verify Test Floor',
                floor: 98,
                imageUrl: '/qr-verify-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });
        floorPlanId = floorPlan.id;

        const space = await prisma.space.create({
            data: {
                floorPlanId,
                name: 'QR Verify Test Room',
                points: '10,10 15,10 15,15 10,15',
                capacity: 4,
                currentQrToken: `qr-verify-${Date.now()}`,
                description: 'QR verify integration test space',
                hasPowerOutlet: true,
            },
        });
        spaceId = space.id;

        ({ client, sessionToken } = await createAuthenticatedClient(userId));
    });

    afterEach(async () => {
        if (spaceId) await prisma.studySession.deleteMany({ where: { spaceId } });
    });

    afterAll(async () => {
        if (spaceId) await prisma.studySession.deleteMany({ where: { spaceId } });
        if (sessionToken) await prisma.session.deleteMany({ where: { sessionToken } });
        if (spaceId) await prisma.space.delete({ where: { id: spaceId } });
        if (floorPlanId) await prisma.floorPlan.delete({ where: { id: floorPlanId } });
        if (userId) await prisma.user.delete({ where: { id: userId } });
        await prisma.$disconnect();
    });

    // -----------------------------------------------------------------------
    // Authentication
    // -----------------------------------------------------------------------

    describe('Authentication', () => {
        it('should return 401 when user is not authenticated', async () => {
            const { status } = await unauthClient.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
            });

            expect(status).toBe(401);
        });
    });

    // -----------------------------------------------------------------------
    // QR verification
    // -----------------------------------------------------------------------

    describe('QR verification', () => {
        it('should return 400 when spaceId is missing', async () => {
            const qrWindow = currentWindow();

            const { status, data } = await client.post(ENDPOINT, {
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, qrWindow),
            });

            expect(status).toBe(400);
            expect(data.error).toBe('missing_params');
        });

        it('should return 400 when qrWindow is missing', async () => {
            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                sig: generateSignature(spaceId, currentWindow()),
            });

            expect(status).toBe(400);
            expect(data.error).toBe('missing_params');
        });

        it('should return 400 when sig is missing', async () => {
            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
            });

            expect(status).toBe(400);
            expect(data.error).toBe('missing_params');
        });

        it('should return 400 when the signature is invalid', async () => {
            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: 'totally-invalid-signature',
            });

            expect(status).toBe(400);
            expect(data.error).toBe('invalid_signature');
        });

        it('should return 400 when the window is expired', async () => {
            const expiredWindow = currentWindow() - 2; // older than previous window

            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: expiredWindow,
                sig: generateSignature(spaceId, expiredWindow),
            });

            expect(status).toBe(400);
            expect(data.error).toBe('expired');
        });

        it('should accept the previous window as valid (grace period)', async () => {
            const { status } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: previousWindow(),
                sig: generateSignature(spaceId, previousWindow()),
            });

            expect(status).toBe(201);
        });

        it('should return 400 when sig is valid but for a different spaceId', async () => {
            const { status, data } = await client.post(ENDPOINT, {
                spaceId: 'different-space-id',
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()), // sig is for the real spaceId
            });

            expect(status).toBe(400);
            expect(data.error).toBe('invalid_signature');
        });
    });

    // -----------------------------------------------------------------------
    // expectedEndTime validation
    // -----------------------------------------------------------------------

    describe('expectedEndTime validation', () => {
        it('should return 400 when expectedEndTime is in the past', async () => {
            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
                expectedEndTime: new Date(Date.now() - 60000).toISOString(),
            });

            expect(status).toBe(400);
            expect(data.error).toBeDefined();
        });

        it('should default expectedEndTime to approximately 15 minutes from now', async () => {
            const now = Date.now();

            const { data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
            });

            const diff = new Date(data.expectedEndTime).getTime() - now;
            const fifteenMin = 15 * 60 * 1000;
            expect(diff).toBeGreaterThanOrEqual(fifteenMin - 5000);
            expect(diff).toBeLessThanOrEqual(fifteenMin + 5000);
        });

        it('should respect a custom expectedEndTime', async () => {
            const customEnd = new Date(Date.now() + 30 * 60 * 1000); // 30 min

            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
                expectedEndTime: customEnd.toISOString(),
            });

            expect(status).toBe(201);
            expect(new Date(data.expectedEndTime).getTime()).toBeCloseTo(customEnd.getTime(), -3);
        });
    });

    // -----------------------------------------------------------------------
    // Session creation
    // -----------------------------------------------------------------------

    describe('Session creation', () => {
        it('should create an ACTIVE session and return 201', async () => {
            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
            });

            expect(status).toBe(201);
            expect(data).toMatchObject({
                id: expect.any(String),
                spaceId,
                hostId: userId,
                status: 'ACTIVE',
            });
        });

        it('should persist the session in the database', async () => {
            const { data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
            });

            const sessionInDb = await prisma.studySession.findUnique({
                where: { id: data.id },
            });

            expect(sessionInDb).toBeTruthy();
            expect(sessionInDb?.spaceId).toBe(spaceId);
            expect(sessionInDb?.hostId).toBe(userId);
        });
    });

    // -----------------------------------------------------------------------
    // Conflict handling
    // -----------------------------------------------------------------------

    describe('Conflict handling', () => {
        it('should return 409 when the space is already occupied', async () => {
            const occupant = await prisma.user.create({
                data: { email: `qr-occupant-${Date.now()}@ualg.pt` },
            });
            await prisma.studySession.create({
                data: {
                    spaceId,
                    hostId: occupant.id,
                    expectedEndTime: new Date(Date.now() + 3600000),
                    status: 'ACTIVE',
                },
            });

            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
            });

            await prisma.studySession.deleteMany({ where: { spaceId } });
            await prisma.user.delete({ where: { id: occupant.id } });

            expect(status).toBe(409);
            expect(data.error).toMatch(/occupied/i);
        });

        it('should return 409 when the user already has an active session elsewhere', async () => {
            const otherSpace = await prisma.space.create({
                data: {
                    floorPlanId,
                    name: 'Other Verify Room',
                    points: '50,50 55,50 55,55 50,55',
                    capacity: 1,
                    currentQrToken: `qr-other-verify-${Date.now()}`,
                },
            });

            await prisma.studySession.create({
                data: {
                    spaceId: otherSpace.id,
                    hostId: userId,
                    expectedEndTime: new Date(Date.now() + 3600000),
                    status: 'ACTIVE',
                },
            });

            const { status, data } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
            });

            expect(status).toBe(409);
            expect(data.error).toMatch(/active session/i);

            await prisma.studySession.deleteMany({ where: { spaceId: otherSpace.id } });
            await prisma.space.delete({ where: { id: otherSpace.id } });
        });

        it('should allow a new session after a previous one is COMPLETED', async () => {
            await prisma.studySession.create({
                data: {
                    spaceId,
                    hostId: userId,
                    expectedEndTime: new Date(),
                    actualEndTime: new Date(),
                    status: 'COMPLETED',
                },
            });

            const { status } = await client.post(ENDPOINT, {
                spaceId,
                qrWindow: currentWindow(),
                sig: generateSignature(spaceId, currentWindow()),
            });

            expect(status).toBe(201);
        });
    });
});
