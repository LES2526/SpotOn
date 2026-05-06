/**
 * @jest-environment node
 */

/**
 * @fileoverview Integration tests for GET /api/spaces.
 *
 * Tests space filtering by floor, type, capacity, hasPowerOutlet,
 * hasComputer, hasInteractiveBoard, and isOccupied via HTTP using
 * axios against a running Next.js dev server.
 *
 * Requires the app and database to be running before executing:
 * `docker compose up` then `npm test`
 *
 * @module __tests__/spaces_tests/Spaces.Integration.test
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import axios, { AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
const ENDPOINT = '/api/spaces';

jest.setTimeout(15000);

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

describe('GET /api/spaces', () => {
    let userId: string;
    let floorPlanId: string;
    let sessionToken: string;
    let client: AxiosInstance;
    let unauthClient: AxiosInstance;

    let computerDeskId: string;
    let interactiveBoardRoomId: string;
    let occupiedSpaceId: string;

    const timestamp = Date.now();

    // SVG polygon points placeholder — represents a small square on the floor plan
    const testPoints = '10,10 20,10 20,20 10,20';

    beforeAll(async () => {
        unauthClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true,
        });

        const user = await prisma.user.create({
            data: { email: `spaces-test-${timestamp}@ualg.pt` },
        });
        userId = user.id;

        const floorPlan = await prisma.floorPlan.create({
            data: {
                name: `Spaces Test Floor ${timestamp}`,
                floor: 9,
                imageUrl: '/spaces-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });
        floorPlanId = floorPlan.id;

        // Individual desk — no extras
        await prisma.space.create({
            data: {
                floorPlanId,
                name: 'Individual Desk',
                points: testPoints,
                capacity: 1,
                currentQrToken: `qr-individual-${timestamp}`,
                type: 'INDIVIDUAL_DESK',
                hasPowerOutlet: false,
                hasComputer: false,
                hasInteractiveBoard: false,
            },
        });
        // Group room — capacity 6
        await prisma.space.create({
            data: {
                floorPlanId,
                name: 'Group Room',
                points: testPoints,
                capacity: 6,
                currentQrToken: `qr-group-${timestamp}`,
                type: 'GROUP_ROOM',
                hasPowerOutlet: false,
                hasComputer: false,
                hasInteractiveBoard: false,
            },
        });
        // Desk with computer
        const computerDesk = await prisma.space.create({
            data: {
                floorPlanId,
                name: 'Computer Desk',
                points: testPoints,
                capacity: 1,
                currentQrToken: `qr-computer-${timestamp}`,
                type: 'INDIVIDUAL_DESK',
                hasPowerOutlet: true,
                hasComputer: true,
                hasInteractiveBoard: false,
            },
        });
        computerDeskId = computerDesk.id;

        // Room with interactive board
        const interactiveBoardRoom = await prisma.space.create({
            data: {
                floorPlanId,
                name: 'Interactive Board Room',
                points: testPoints,
                capacity: 8,
                currentQrToken: `qr-board-${timestamp}`,
                type: 'GROUP_ROOM',
                hasPowerOutlet: true,
                hasComputer: false,
                hasInteractiveBoard: true,
            },
        });
        interactiveBoardRoomId = interactiveBoardRoom.id;

        // Desk with power outlet only
        await prisma.space.create({
            data: {
                floorPlanId,
                name: 'Power Outlet Desk',
                points: testPoints,
                capacity: 1,
                currentQrToken: `qr-outlet-${timestamp}`,
                type: 'INDIVIDUAL_DESK',
                hasPowerOutlet: true,
                hasComputer: false,
                hasInteractiveBoard: false,
            },
        });
        // Occupied space
        const occupiedSpace = await prisma.space.create({
            data: {
                floorPlanId,
                name: 'Occupied Space',
                points: testPoints,
                capacity: 1,
                currentQrToken: `qr-occupied-${timestamp}`,
                type: 'INDIVIDUAL_DESK',
                hasPowerOutlet: false,
                hasComputer: false,
                hasInteractiveBoard: false,
            },
        });
        occupiedSpaceId = occupiedSpace.id;

        await prisma.studySession.create({
            data: {
                spaceId: occupiedSpaceId,
                hostId: userId,
                expectedEndTime: new Date(Date.now() + 3600000),
                status: 'ACTIVE',
            },
        });

        ({ client, sessionToken } = await createAuthenticatedClient(userId));
    });

    afterAll(async () => {
        await prisma.studySession.deleteMany({ where: { hostId: userId } });
        await prisma.space.deleteMany({ where: { floorPlanId } });
        await prisma.floorPlan.delete({ where: { id: floorPlanId } });
        await prisma.session.deleteMany({ where: { sessionToken } });
        await prisma.user.delete({ where: { id: userId } });
        await prisma.$disconnect();
    });

    // -----------------------------------------------------------------------
    // Authentication
    // -----------------------------------------------------------------------

    describe('Authentication', () => {
        it('should return 401 when user is not authenticated', async () => {
            const { status } = await unauthClient.get(ENDPOINT);
            expect(status).toBe(401);
        });

        it('should return 200 when user is authenticated', async () => {
            const { status } = await client.get(ENDPOINT);
            expect(status).toBe(200);
        });
    });

    // -----------------------------------------------------------------------
    // Response shape
    // -----------------------------------------------------------------------

    describe('Response shape', () => {
        it('should return a spaces array', async () => {
            const { data } = await client.get(ENDPOINT);
            expect(Array.isArray(data.spaces)).toBe(true);
        });

        it('should include floorPlan and sessions in each space', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}` },
            });
            const space = data.spaces[0];
            expect(space.floorPlan).toBeDefined();
            expect(Array.isArray(space.sessions)).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Floor filter
    // -----------------------------------------------------------------------

    describe('Floor filter', () => {
        it('should return only spaces on the specified floor', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}` },
            });

            expect(data.spaces.length).toBe(6);
            data.spaces.forEach((space: any) => {
                expect(space.floorPlan.name).toBe(`Spaces Test Floor ${timestamp}`);
            });
        });

        it('should return empty array for a floor with no spaces', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: 'Nonexistent Floor' },
            });
            expect(data.spaces.length).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // Type filter
    // -----------------------------------------------------------------------

    describe('Type filter', () => {
        it('should return only INDIVIDUAL_DESK spaces', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, type: 'INDIVIDUAL_DESK' },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.type).toBe('INDIVIDUAL_DESK');
            });
        });

        it('should return only GROUP_ROOM spaces', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, type: 'GROUP_ROOM' },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.type).toBe('GROUP_ROOM');
            });
        });

        it('should ignore invalid type values', async () => {
            const { status } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, type: 'INVALID_TYPE' },
            });
            expect(status).toBe(200);
        });
    });

    // -----------------------------------------------------------------------
    // Capacity filter
    // -----------------------------------------------------------------------

    describe('Capacity filter', () => {
        it('should return only spaces with capacity >= requested', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, capacity: 6 },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.capacity).toBeGreaterThanOrEqual(6);
            });
        });

        it('should return spaces with exactly the requested capacity', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, capacity: 8 },
            });

            expect(data.spaces.length).toBe(1);
            expect(data.spaces[0].id).toBe(interactiveBoardRoomId);
        });
    });

    // -----------------------------------------------------------------------
    // hasPowerOutlet filter
    // -----------------------------------------------------------------------

    describe('hasPowerOutlet filter', () => {
        it('should return only spaces with a power outlet', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, hasPowerOutlet: true },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.hasPowerOutlet).toBe(true);
            });
        });

        it('should return only spaces without a power outlet', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, hasPowerOutlet: false },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.hasPowerOutlet).toBe(false);
            });
        });
    });

    // -----------------------------------------------------------------------
    // hasComputer filter
    // -----------------------------------------------------------------------

    describe('hasComputer filter', () => {
        it('should return only spaces with a computer', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, hasComputer: true },
            });

            expect(data.spaces.length).toBe(1);
            expect(data.spaces[0].id).toBe(computerDeskId);
        });

        it('should return only spaces without a computer', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, hasComputer: false },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.hasComputer).toBe(false);
            });
        });
    });

    // -----------------------------------------------------------------------
    // hasInteractiveBoard filter
    // -----------------------------------------------------------------------

    describe('hasInteractiveBoard filter', () => {
        it('should return only spaces with an interactive board', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, hasInteractiveBoard: true },
            });

            expect(data.spaces.length).toBe(1);
            expect(data.spaces[0].id).toBe(interactiveBoardRoomId);
        });

        it('should return only spaces without an interactive board', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, hasInteractiveBoard: false },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.hasInteractiveBoard).toBe(false);
            });
        });
    });

    // -----------------------------------------------------------------------
    // isOccupied filter
    // -----------------------------------------------------------------------

    describe('isOccupied filter', () => {
        it('should return only occupied spaces', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, isOccupied: true },
            });

            expect(data.spaces.length).toBe(1);
            expect(data.spaces[0].id).toBe(occupiedSpaceId);
        });

        it('should return only free spaces', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: { floor: `Spaces Test Floor ${timestamp}`, isOccupied: false },
            });

            expect(data.spaces.length).toBe(5);
            data.spaces.forEach((space: any) => {
                expect(space.id).not.toBe(occupiedSpaceId);
            });
        });
    });

    // -----------------------------------------------------------------------
    // Combined filters
    // -----------------------------------------------------------------------

    describe('Combined filters', () => {
        it('should filter by type and hasPowerOutlet together', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: {
                    floor: `Spaces Test Floor ${timestamp}`,
                    type: 'INDIVIDUAL_DESK',
                    hasPowerOutlet: true,
                },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.type).toBe('INDIVIDUAL_DESK');
                expect(space.hasPowerOutlet).toBe(true);
            });
        });

        it('should filter by type and hasComputer together', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: {
                    floor: `Spaces Test Floor ${timestamp}`,
                    type: 'INDIVIDUAL_DESK',
                    hasComputer: true,
                },
            });

            expect(data.spaces.length).toBe(1);
            expect(data.spaces[0].id).toBe(computerDeskId);
        });

        it('should filter by GROUP_ROOM and hasInteractiveBoard together', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: {
                    floor: `Spaces Test Floor ${timestamp}`,
                    type: 'GROUP_ROOM',
                    hasInteractiveBoard: true,
                },
            });

            expect(data.spaces.length).toBe(1);
            expect(data.spaces[0].id).toBe(interactiveBoardRoomId);
        });

        it('should filter by isOccupied and type together', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: {
                    floor: `Spaces Test Floor ${timestamp}`,
                    type: 'INDIVIDUAL_DESK',
                    isOccupied: false,
                },
            });

            expect(data.spaces.length).toBeGreaterThan(0);
            data.spaces.forEach((space: any) => {
                expect(space.type).toBe('INDIVIDUAL_DESK');
                expect(space.sessions.length).toBe(0);
            });
        });

        it('should return empty array when no spaces match combined filters', async () => {
            const { data } = await client.get(ENDPOINT, {
                params: {
                    floor: `Spaces Test Floor ${timestamp}`,
                    type: 'GROUP_ROOM',
                    hasComputer: true,
                    hasInteractiveBoard: true,
                },
            });

            expect(data.spaces.length).toBe(0);
        });
    });
});
