/**
 * @jest-environment node
 */

/**
 * @fileoverview Integration tests for QR code and session management endpoints.
 *
 * Tests the following endpoints via HTTP using axios against a running Next.js dev server:
 * - GET  /api/qrcode/display/[spaceId]
 * - POST /api/qrcode/verify
 * - GET  /api/qrcode/[token]
 * - POST /api/spaces/[spaceId]/sessions
 * - PATCH /api/spaces/[spaceId]/sessions
 *
 * Requires the app and database to be running before executing:
 * `docker compose up` then `npm test`
 *
 * @module __tests__/sprint3/Sprint3.Integration.test
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { currentWindow, generateSignature, previousWindow } from '@/lib/qr-utils';
import axios, { AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
const QR_TOKEN = `qr-sprint3-${Date.now()}`;

async function createAuthenticatedClient(userId: string): Promise<{ client: AxiosInstance; sessionToken: string }> {
    const sessionToken = `test-session-${userId}-${Date.now()}`;

    await prisma.session.create({
        data: {
            sessionToken,
            userId,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });

    const client = axios.create({
        baseURL: BASE_URL,
        headers: { Cookie: `next-auth.session-token=${sessionToken}` },
        validateStatus: () => true,
    });

    return { client, sessionToken };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

describe('Sprint 3 — QR Code & Session API', () => {
    let userId: string;
    let floorPlanId: string;
    let spaceId: string;
    let sessionToken: string;
    let client: AxiosInstance;
    let unauthClient: AxiosInstance;

    beforeAll(async () => {
        unauthClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true,
        });

        const user = await prisma.user.create({
            data: { email: `sprint3-test-${Date.now()}@ualg.pt` },
        });
        userId = user.id;

        const floorPlan = await prisma.floorPlan.create({
            data: {
                name: 'Sprint3 Test Floor',
                floor: 1,
                imageUrl: '/sprint3-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });
        floorPlanId = floorPlan.id;

        const space = await prisma.space.create({
            data: {
                floorPlanId,
                name: 'Sprint3 Test Room',
                posX: 10,
                posY: 10,
                width: 5,
                height: 5,
                capacity: 4,
                currentQrToken: QR_TOKEN,
                description: 'Sprint 3 integration test space',
                hasPowerOutlet: true,
            },
        });
        spaceId = space.id;

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
    // GET /api/qrcode/display/[spaceId]
    // -----------------------------------------------------------------------

    describe('GET /api/qrcode/display/[spaceId]', () => {
        describe('Authentication', () => {
            it('should return 200 without authentication (public endpoint)', async () => {
                const { status } = await unauthClient.get(`/api/qrcode/display/${spaceId}`);
                expect(status).toBe(200);
            });
        });

        describe('Space resolution', () => {
            it('should return 404 for an unknown spaceId', async () => {
                const { status } = await client.get('/api/qrcode/display/unknown-space-id');
                expect(status).toBe(404);
            });

            it('should return a qrCodeURL for a valid spaceId', async () => {
                const { status, data } = await client.get(`/api/qrcode/display/${spaceId}`);
                expect(status).toBe(200);
                expect(data.qrCodeURL).toBeDefined();
                expect(typeof data.qrCodeURL).toBe('string');
            });

            it('should return a URL containing the spaceId', async () => {
                const { data } = await client.get(`/api/qrcode/display/${spaceId}`);
                expect(data.qrCodeURL).toContain(spaceId);
            });

            it('should return a URL containing a window and sig parameter', async () => {
                const { data } = await client.get(`/api/qrcode/display/${spaceId}`);
                const url = new URL(data.qrCodeURL);
                expect(url.searchParams.get('window')).toBeTruthy();
                expect(url.searchParams.get('sig')).toBeTruthy();
            });

            it('should return a valid HMAC signature in the URL', async () => {
                const { data } = await client.get(`/api/qrcode/display/${spaceId}`);
                const url = new URL(data.qrCodeURL);
                const window = Number(url.searchParams.get('window'));
                const sig = url.searchParams.get('sig');
                const expectedSig = generateSignature(spaceId, window);
                expect(sig).toBe(expectedSig);
            });
        });
    });

    // -----------------------------------------------------------------------
    // POST /api/qrcode/verify
    // -----------------------------------------------------------------------

    describe('POST /api/qrcode/verify', () => {
        describe('Authentication', () => {
            it('should return 401 when user is not authenticated', async () => {
                const { status } = await unauthClient.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow: currentWindow(),
                    sig: generateSignature(spaceId, currentWindow()),
                });
                expect(status).toBe(401);
            });
        });

        describe('QR verification', () => {
            it('should return 400 when spaceId is missing', async () => {
                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                });
                expect(status).toBe(400);
                expect(data.error).toBe('missing_params');
            });

            it('should return 400 when qrWindow is missing', async () => {
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    sig: generateSignature(spaceId, currentWindow()),
                });
                expect(status).toBe(400);
                expect(data.error).toBe('missing_params');
            });

            it('should return 400 when sig is missing', async () => {
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow: currentWindow(),
                });
                expect(status).toBe(400);
                expect(data.error).toBe('missing_params');
            });

            it('should return 400 when the signature is invalid', async () => {
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow: currentWindow(),
                    sig: 'invalid-signature',
                });
                expect(status).toBe(400);
                expect(data.error).toBe('invalid_signature');
            });

            it('should return 400 when the window is expired', async () => {
                const expiredWindow = currentWindow() - 2;
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow: expiredWindow,
                    sig: generateSignature(spaceId, expiredWindow),
                });
                expect(status).toBe(400);
                expect(data.error).toBe('expired');
            });

            it('should accept the previous window as valid (grace period)', async () => {
                const qrWindow = previousWindow();
                const { status } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                });
                expect(status).toBe(201);
            });

            it('should return 400 when sig is valid but for a different spaceId', async () => {
                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId: 'different-space-id',
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                });
                expect(status).toBe(400);
                expect(data.error).toBe('invalid_signature');
            });
        });

        describe('Session creation', () => {
            it('should create an ACTIVE session and return 201', async () => {
                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
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
                const qrWindow = currentWindow();
                const { data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                });

                const sessionInDb = await prisma.studySession.findUnique({
                    where: { id: data.id },
                });
                expect(sessionInDb).toBeTruthy();
                expect(sessionInDb?.spaceId).toBe(spaceId);
                expect(sessionInDb?.hostId).toBe(userId);
            });

            it('should default expectedEndTime to approximately 1 hour from now', async () => {
                const now = Date.now();
                const qrWindow = currentWindow();
                const { data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                });

                const diff = new Date(data.expectedEndTime).getTime() - now;
                const oneHour = 3600000;
                expect(diff).toBeGreaterThanOrEqual(oneHour - 5000);
                expect(diff).toBeLessThanOrEqual(oneHour + 5000);
            });

            it('should respect a custom expectedEndTime', async () => {
                const customEnd = new Date(Date.now() + 30 * 60 * 1000);
                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                    expectedEndTime: customEnd.toISOString(),
                });

                expect(status).toBe(201);
                expect(new Date(data.expectedEndTime).getTime()).toBeCloseTo(customEnd.getTime(), -3);
            });

            it('should return 400 when expectedEndTime is in the past', async () => {
                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
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

                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                });
                expect(status).toBe(409);
                expect(data.error).toMatch(/occupied/i);
            });

            it('should return 409 when the user already has an active session elsewhere', async () => {
                const otherSpace = await prisma.space.create({
                    data: {
                        floorPlanId,
                        name: 'Other Sprint3 Room',
                        posX: 50,
                        posY: 50,
                        width: 5,
                        height: 5,
                        capacity: 1,
                        currentQrToken: `qr-other-sprint3-${Date.now()}`,
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

                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
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

                const qrWindow = currentWindow();
                const { status } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                });
                expect(status).toBe(201);
            });
        });

        describe('Library hours clamping', () => {
            it('should clamp expectedEndTime to closing time if it exceeds it', async () => {
                const closingTime = process.env.LIBRARY_CLOSING_TIME ?? '20:30';
                const [hours, minutes] = closingTime.split(':').map(Number);

                const afterClosing = new Date();
                afterClosing.setHours(hours + 1, 0, 0, 0); // 1 hour after closing

                const qrWindow = currentWindow();
                const { status, data } = await client.post('/api/qrcode/verify', {
                    spaceId,
                    qrWindow,
                    sig: generateSignature(spaceId, qrWindow),
                    expectedEndTime: afterClosing.toISOString(),
                });

                expect(status).toBe(201);
                const returnedEnd = new Date(data.expectedEndTime);
                expect(returnedEnd.getHours()).toBeLessThanOrEqual(hours);
            });

            it('should return 400 when less than 15 minutes remain before closing', async () => {
                const closingTime = process.env.LIBRARY_CLOSING_TIME ?? '20:30';
                const [hours, minutes] = closingTime.split(':').map(Number);

                // Mock current time to be 10 minutes before closing
                const tenMinsBeforeClosing = new Date();
                tenMinsBeforeClosing.setHours(hours, minutes - 10, 0, 0);

                // This test only runs meaningfully if current time is near closing
                // Skip if we're not close enough to closing time to test this
                const now = new Date();
                const closingDate = new Date();
                closingDate.setHours(hours, minutes, 0, 0);
                const minsUntilClosing = (closingDate.getTime() - now.getTime()) / 60000;

                if (minsUntilClosing > 0 && minsUntilClosing < 15) {
                    const qrWindow = currentWindow();
                    const { status } = await client.post('/api/qrcode/verify', {
                        spaceId,
                        qrWindow,
                        sig: generateSignature(spaceId, qrWindow),
                    });
                    expect(status).toBe(400);
                } else {
                    console.log('Skipping closing time test — not within 15 minutes of closing');
                }
            });
        });
    });

    // -----------------------------------------------------------------------
    // POST /api/spaces/[spaceId]/sessions
    // -----------------------------------------------------------------------

    describe('POST /api/spaces/[spaceId]/sessions', () => {
        describe('Authentication', () => {
            it('should return 401 when user is not authenticated', async () => {
                const { status } = await unauthClient.post(`/api/spaces/${spaceId}/sessions`);
                expect(status).toBe(401);
            });
        });

        describe('Session creation', () => {
            it('should create an ACTIVE session and return 201', async () => {
                const { status, data } = await client.post(`/api/spaces/${spaceId}/sessions`);
                expect(status).toBe(201);
                expect(data).toMatchObject({
                    id: expect.any(String),
                    spaceId,
                    hostId: userId,
                    status: 'ACTIVE',
                });
            });

            it('should return 404 if space does not exist', async () => {
                const { status } = await client.post('/api/spaces/nonexistent-space/sessions');
                expect(status).toBe(404);
            });

            it('should default expectedEndTime to approximately 1 hour from now', async () => {
                const now = Date.now();
                const { data } = await client.post(`/api/spaces/${spaceId}/sessions`);

                const diff = new Date(data.expectedEndTime).getTime() - now;
                const oneHour = 3600000;
                expect(diff).toBeGreaterThanOrEqual(oneHour - 5000);
                expect(diff).toBeLessThanOrEqual(oneHour + 5000);
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

                const { status, data } = await client.post(`/api/spaces/${spaceId}/sessions`);
                expect(status).toBe(409);
                expect(data.error).toMatch(/occupied/i);
            });

            it('should return 409 when the user already has an active session elsewhere', async () => {
                const otherSpace = await prisma.space.create({
                    data: {
                        floorPlanId,
                        name: 'Other Session Room',
                        posX: 70,
                        posY: 70,
                        width: 5,
                        height: 5,
                        capacity: 1,
                        currentQrToken: `qr-other-session-${Date.now()}`,
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

                const { status, data } = await client.post(`/api/spaces/${spaceId}/sessions`);
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

                const { status } = await client.post(`/api/spaces/${spaceId}/sessions`);
                expect(status).toBe(201);
            });
        });
    });

    // -----------------------------------------------------------------------
    // PATCH /api/spaces/[spaceId]/sessions
    // -----------------------------------------------------------------------

    describe('PATCH /api/spaces/[spaceId]/sessions', () => {
        describe('Authentication', () => {
            it('should return 401 when user is not authenticated', async () => {
                const { status } = await unauthClient.patch(`/api/spaces/${spaceId}/sessions`, {
                    expectedEndTime: new Date(Date.now() + 3600000).toISOString(),
                });
                expect(status).toBe(401);
            });
        });

        describe('Session update', () => {
            beforeEach(async () => {
                await prisma.studySession.create({
                    data: {
                        spaceId,
                        hostId: userId,
                        expectedEndTime: new Date(Date.now() + 3600000),
                        status: 'ACTIVE',
                    },
                });
            });

            it('should update expectedEndTime and return 200', async () => {
                const newEnd = new Date(Date.now() + 30 * 60 * 1000);
                const { status, data } = await client.patch(`/api/spaces/${spaceId}/sessions`, {
                    expectedEndTime: newEnd.toISOString(),
                });

                expect(status).toBe(200);
                expect(new Date(data.expectedEndTime).getTime()).toBeCloseTo(newEnd.getTime(), -3);
            });

            it('should return 400 when expectedEndTime is in the past', async () => {
                const { status, data } = await client.patch(`/api/spaces/${spaceId}/sessions`, {
                    expectedEndTime: new Date(Date.now() - 60000).toISOString(),
                });
                expect(status).toBe(400);
                expect(data.error).toBeDefined();
            });

            it('should return 404 when no active session exists for this user in this space', async () => {
                await prisma.studySession.deleteMany({ where: { spaceId } });

                const { status } = await client.patch(`/api/spaces/${spaceId}/sessions`, {
                    expectedEndTime: new Date(Date.now() + 3600000).toISOString(),
                });
                expect(status).toBe(404);
            });

            it('should not update a COMPLETED session', async () => {
                await prisma.studySession.updateMany({
                    where: { spaceId, hostId: userId, status: 'ACTIVE' },
                    data: { status: 'COMPLETED', actualEndTime: new Date() },
                });

                const { status } = await client.patch(`/api/spaces/${spaceId}/sessions`, {
                    expectedEndTime: new Date(Date.now() + 3600000).toISOString(),
                });
                expect(status).toBe(404);
            });
        });

        describe('Library hours clamping', () => {
            beforeEach(async () => {
                await prisma.studySession.create({
                    data: {
                        spaceId,
                        hostId: userId,
                        expectedEndTime: new Date(Date.now() + 3600000),
                        status: 'ACTIVE',
                    },
                });
            });

            it('should clamp expectedEndTime to closing time if it exceeds it', async () => {
                const closingTime = process.env.LIBRARY_CLOSING_TIME ?? '20:30';
                const [hours, minutes] = closingTime.split(':').map(Number);

                const afterClosing = new Date();
                afterClosing.setHours(hours + 1, 0, 0, 0);

                const { status, data } = await client.patch(`/api/spaces/${spaceId}/sessions`, {
                    expectedEndTime: afterClosing.toISOString(),
                });

                expect(status).toBe(200);
                const returnedEnd = new Date(data.expectedEndTime);
                expect(returnedEnd.getHours()).toBeLessThanOrEqual(hours);
            });
        });
    });
});