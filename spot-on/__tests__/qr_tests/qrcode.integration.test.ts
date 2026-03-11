/**
 * @jest-environment node
 */

/**
 * @fileoverview Integration tests for QR code-based space lookup and session creation.
 *
 * Tests GET and POST /api/qrcode/[token] via HTTP using axios against a running
 * Next.js dev server. Requires the app and database to be running before executing.
 *
 * @module __tests__/qrcode_tests/QRCode.Integration.test
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import axios, { AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// Axios client — points at the running Next.js dev server
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

/**
 * Creates an axios instance with a valid session cookie for the given user.
 * Since the app uses database sessions, we insert one directly and pass its
 * token as a cookie so the server treats the request as authenticated.
 */
async function createAuthenticatedClient(userId: string): Promise<{ client: AxiosInstance; sessionToken: string }> {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionToken = `test-session-${userId}-${Date.now()}`;

    await prisma.session.create({
        data: { sessionToken, userId, expires },
    });

    const client = axios.create({
        baseURL: BASE_URL,
        headers: { Cookie: `next-auth.session-token=${sessionToken}` },
        validateStatus: () => true, // never throw on non-2xx so we can assert status codes
    });

    return { client, sessionToken };
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

describe('QR Code API', () => {
    let userId: string;
    let floorPlanId: string;
    let spaceId: string;
    let sessionToken: string;
    let client: AxiosInstance;
    let unauthClient: AxiosInstance;

    const QR_TOKEN = `qr-test-${Date.now()}`;

    beforeAll(async () => {
        // Unauthenticated client
        unauthClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true,
        });

        // Create DB fixtures
        const user = await prisma.user.create({
            data: { email: `qr-test-${Date.now()}@ualg.pt` },
        });
        userId = user.id;

        const floorPlan = await prisma.floorPlan.create({
            data: {
                name: 'QR Test Floor',
                floor: 2,
                imageUrl: '/qr-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });
        floorPlanId = floorPlan.id;

        const space = await prisma.space.create({
            data: {
                floorPlanId,
                name: 'QR Test Room',
                posX: 10,
                posY: 10,
                width: 5,
                height: 5,
                capacity: 4,
                currentQrToken: QR_TOKEN,
                description: 'QR code integration test space',
                hasPowerOutlet: true,
            },
        });
        spaceId = space.id;

        // Authenticated client via injected session
        ({ client, sessionToken } = await createAuthenticatedClient(userId));
    });

    afterEach(async () => {
        await prisma.studySession.deleteMany({ where: { spaceId } });
    });

    afterAll(async () => {
        await prisma.studySession.deleteMany({ where: { spaceId } });
        await prisma.session.deleteMany({ where: { sessionToken } });
        await prisma.space.delete({ where: { id: spaceId } });
        await prisma.floorPlan.delete({ where: { id: floorPlanId } });
        await prisma.user.delete({ where: { id: userId } });
        await prisma.$disconnect();
    });

    // -----------------------------------------------------------------------
    // GET /api/qrcode/[token]
    // -----------------------------------------------------------------------

    describe('GET /api/qrcode/[token]', () => {
        describe('Authentication', () => {
            it('should return 401 when user is not authenticated', async () => {
                const { status } = await unauthClient.get(`/api/qrcode/${QR_TOKEN}`);
                expect(status).toBe(401);
            });
        });

        describe('Token resolution', () => {
            it('should return 404 for an unknown QR token', async () => {
                const { status, data } = await client.get('/api/qrcode/qr-does-not-exist');
                expect(status).toBe(404);
                expect(data.error).toBeDefined();
            });

            it('should return space data for a valid token', async () => {
                const { status, data } = await client.get(`/api/qrcode/${QR_TOKEN}`);
                expect(status).toBe(200);
                expect(data).toMatchObject({
                    id: spaceId,
                    name: 'QR Test Room',
                    capacity: 4,
                    hasPowerOutlet: true,
                    floorPlan: { name: 'QR Test Floor' },
                });
            });

            it('should not expose currentQrToken in the response', async () => {
                const { data } = await client.get(`/api/qrcode/${QR_TOKEN}`);
                expect(data.currentQrToken).toBeUndefined();
            });
        });

        describe('Occupancy status', () => {
            it('should report isOccupied: false when no active session exists', async () => {
                const { data } = await client.get(`/api/qrcode/${QR_TOKEN}`);
                expect(data.isOccupied).toBe(false);
            });

            it('should report isOccupied: true when an active session exists', async () => {
                await prisma.studySession.create({
                    data: {
                        spaceId,
                        hostId: userId,
                        expectedEndTime: new Date(Date.now() + 3600000),
                        status: 'ACTIVE',
                    },
                });

                const { data } = await client.get(`/api/qrcode/${QR_TOKEN}`);
                expect(data.isOccupied).toBe(true);
            });

            it('should report isOccupied: false when only a COMPLETED session exists', async () => {
                await prisma.studySession.create({
                    data: {
                        spaceId,
                        hostId: userId,
                        expectedEndTime: new Date(),
                        actualEndTime: new Date(),
                        status: 'COMPLETED',
                    },
                });

                const { data } = await client.get(`/api/qrcode/${QR_TOKEN}`);
                expect(data.isOccupied).toBe(false);
            });

            it('should report isOccupied: false when active session expectedEndTime has passed', async () => {
                await prisma.studySession.create({
                    data: {
                        spaceId,
                        hostId: userId,
                        expectedEndTime: new Date(Date.now() - 1000),
                        status: 'ACTIVE',
                    },
                });

                const { data } = await client.get(`/api/qrcode/${QR_TOKEN}`);
                expect(data.isOccupied).toBe(false);
            });
        });
    });

    // -----------------------------------------------------------------------
    // POST /api/qrcode/[token]
    // -----------------------------------------------------------------------

    describe('POST /api/qrcode/[token]', () => {
        describe('Authentication', () => {
            it('should return 401 when user is not authenticated', async () => {
                const { status } = await unauthClient.post(`/api/qrcode/${QR_TOKEN}`);
                expect(status).toBe(401);
            });
        });

        describe('Token resolution', () => {
            it('should return 404 for an unknown QR token', async () => {
                const { status } = await client.post('/api/qrcode/qr-does-not-exist');
                expect(status).toBe(404);
            });
        });

        describe('Session creation', () => {
            it('should create an ACTIVE session and return 201', async () => {
                const { status, data } = await client.post(`/api/qrcode/${QR_TOKEN}`);
                expect(status).toBe(201);
                expect(data).toMatchObject({
                    id: expect.any(String),
                    spaceId,
                    hostId: userId,
                    status: 'ACTIVE',
                });
            });

            it('should persist the session in the database', async () => {
                const { data } = await client.post(`/api/qrcode/${QR_TOKEN}`);

                const sessionInDb = await prisma.studySession.findUnique({
                    where: { id: data.id },
                });
                expect(sessionInDb).toBeTruthy();
                expect(sessionInDb?.spaceId).toBe(spaceId);
            });

            it('should default expectedEndTime to approximately 1 hour from now', async () => {
                const now = Date.now();
                const { data } = await client.post(`/api/qrcode/${QR_TOKEN}`);

                const diff = new Date(data.expectedEndTime).getTime() - now;
                const oneHour = 3600000;
                expect(diff).toBeGreaterThanOrEqual(oneHour - 5000);
                expect(diff).toBeLessThanOrEqual(oneHour + 5000);
            });

            it('should respect a custom expectedEndTime provided in the request body', async () => {
                const customEnd = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

                const { status, data } = await client.post(`/api/qrcode/${QR_TOKEN}`, {
                    expectedEndTime: customEnd.toISOString(),
                });

                expect(status).toBe(201);
                expect(new Date(data.expectedEndTime).getTime()).toBeCloseTo(customEnd.getTime(), -3);
            });

            it('should return 201 when expectedEndTime is in the past', async () => {
                const { status, data } = await client.post(`/api/qrcode/${QR_TOKEN}`, {
                    expectedEndTime: new Date(Date.now() - 60000).toISOString(),
                });

                expect(status).toBe(400);
                expect(data.error).toBeDefined();
            });
        });

        describe('Conflict handling', () => {
            it('should return 409 when the space is already occupied', async () => {
                await prisma.studySession.create({
                    data: {
                        spaceId,
                        hostId: userId,
                        expectedEndTime: new Date(Date.now() + 3600000),
                        status: 'ACTIVE',
                    },
                });

                const { status, data } = await client.post(`/api/qrcode/${QR_TOKEN}`);
                expect(status).toBe(409);
                expect(data.error).toMatch(/occupied/i);
            });

            it('should return 409 when the user already has an active session elsewhere', async () => {
                const otherSpace = await prisma.space.create({
                    data: {
                        floorPlanId,
                        name: 'Other QR Room',
                        posX: 50,
                        posY: 50,
                        width: 5,
                        height: 5,
                        capacity: 1,
                        currentQrToken: `qr-other-${Date.now()}`,
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

                const { status, data } = await client.post(`/api/qrcode/${QR_TOKEN}`);
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

                const { status } = await client.post(`/api/qrcode/${QR_TOKEN}`);
                expect(status).toBe(201);
            });
        });
    });
});