/**
 * @jest-environment node
 */

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { PATCH } from '@/app/api/spaces/[spaceId]/sessions/extend/route';
import { prisma } from '@/lib/prisma';
import type { FloorPlan, Space, User } from '@/app/generated/prisma';
import { getServerSession } from 'next-auth';

describe('PATCH /api/spaces/[spaceId]/sessions/extend', () => {
    let testUser: User;
    let testFloorPlan: FloorPlan;
    let testSpace: Space;

    beforeAll(async () => {
        testUser = await prisma.user.create({
            data: {
                email: `extend-test-${Date.now()}@ualg.pt`,
            },
        });

        const leftoverFloor = await prisma.floorPlan.findFirst({
            where: { name: 'Extend Floor' },
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
                name: 'Extend Floor',
                floor: 92,
                imageUrl: '/extend-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Extend Test Space',
                points: '10,20 15,20 15,25 10,25',
                capacity: 4,
                currentQrToken: `qr-extend-${Date.now()}`,
                description: 'Integration test space for extending',
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

    it('should extend the session successfully', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: testUser.id },
        });

        const initialEndTime = new Date();
        initialEndTime.setUTCHours(14, 0, 0, 0); // 14:00 UTC

        await prisma.studySession.create({
            data: {
                spaceId: testSpace.id,
                hostId: testUser.id,
                expectedEndTime: initialEndTime,
                status: 'ACTIVE',
            },
        });

        const newEndTime = new Date();
        newEndTime.setUTCHours(15, 0, 0, 0); // 15:00 UTC

        const request = new Request('http://localhost', {
            method: 'PATCH',
            body: JSON.stringify({ expectedEndTime: newEndTime.toISOString() }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(new Date(body.expectedEndTime).toISOString()).toBe(newEndTime.toISOString());
    });

    it('should not allow extending past 19:30', async () => {
        const originalClosingTime = process.env.LIBRARY_CLOSING_TIME;
        const originalBypass = process.env.BYPASS_HOURS_CHECK;
        process.env.LIBRARY_CLOSING_TIME = '14:00';
        process.env.BYPASS_HOURS_CHECK = 'false';
        try {
            (getServerSession as jest.Mock).mockResolvedValue({
                user: { id: testUser.id },
            });

            const newEndTimeInvalid = new Date();
            newEndTimeInvalid.setUTCHours(14, 1, 0, 0); // 1 min after 14:00 closing

            const request = new Request('http://localhost', {
                method: 'PATCH',
                body: JSON.stringify({ expectedEndTime: newEndTimeInvalid.toISOString() }),
            });

            const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
            expect(response.status).toBe(400);

            const body = await response.json();
            expect(body.error).toBe('Is not allowed to extend session beyond 14:00');
        } finally {
            process.env.LIBRARY_CLOSING_TIME = originalClosingTime;
            process.env.BYPASS_HOURS_CHECK = originalBypass;
        }
    });

    it('should return 404 if there is no active session for the user', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: testUser.id },
        });

        const newEndTime = new Date();
        newEndTime.setUTCHours(15, 0, 0, 0); // 15:00 UTC

        const request = new Request('http://localhost', {
            method: 'PATCH',
            body: JSON.stringify({ expectedEndTime: newEndTime.toISOString() }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
        expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const request = new Request('http://localhost', {
            method: 'PATCH',
            body: JSON.stringify({ expectedEndTime: new Date().toISOString() }),
        });

        const response = await PATCH(request, { params: Promise.resolve({ spaceId: testSpace.id }) });
        expect(response.status).toBe(401);
    });
});
