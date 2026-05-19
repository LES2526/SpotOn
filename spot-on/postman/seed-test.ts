/**
 * Test-data seed for Postman/Newman API tests.
 *
 * Idempotent: safe to re-run. Creates two known users (host + guest),
 * one floor plan, and one space with a deterministic id and QR token
 * so the Postman environment file can hard-code them.
 *
 * Usage:
 *   ENABLE_TEST_AUTH=true \
 *   DATABASE_URL=postgres://.../spoton_test \
 *   QR_SECRET=test-secret \
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' postman/seed-test.ts
 */

import {
    PrismaClient,
    SessionStatus,
    SpaceType,
} from '../app/generated/prisma';

const prisma = new PrismaClient();

const HOST_ID = 'test-host-user';
const GUEST_ID = 'test-guest-user';
const SPACE_ID = 'test-space-group';
const DESK_ID = 'test-space-desk';
const FLOOR_ID = 'test-floor-plan';

async function main() {
    console.log('Seeding test database...');

    // Clean test data only (matches our deterministic ids; leaves the rest alone)
    await prisma.report.deleteMany({
        where: { session: { spaceId: { in: [SPACE_ID, DESK_ID] } } },
    });
    await prisma.joinRequest.deleteMany({
        where: { spaceId: { in: [SPACE_ID, DESK_ID] } },
    });
    await prisma.userOnStudySession.deleteMany({
        where: { session: { spaceId: { in: [SPACE_ID, DESK_ID] } } },
    });
    await prisma.studySession.deleteMany({
        where: { spaceId: { in: [SPACE_ID, DESK_ID] } },
    });
    await prisma.notification.deleteMany({
        where: { userId: { in: [HOST_ID, GUEST_ID] } },
    });
    await prisma.space.deleteMany({ where: { id: { in: [SPACE_ID, DESK_ID] } } });
    await prisma.floorPlan.deleteMany({ where: { id: FLOOR_ID } });
    await prisma.user.deleteMany({ where: { id: { in: [HOST_ID, GUEST_ID] } } });

    await prisma.user.create({
        data: {
            id: HOST_ID,
            email: 'host.test@ualg.pt',
            studentId: '999001',
            points: 100,
        },
    });

    await prisma.user.create({
        data: {
            id: GUEST_ID,
            email: 'guest.test@ualg.pt',
            studentId: '999002',
            points: 50,
        },
    });

    await prisma.floorPlan.create({
        data: {
            id: FLOOR_ID,
            name: 'Test Floor',
            floor: 99,
            imageUrl: '/PISO_1.svg',
            imageWidth: 2000,
            imageHeight: 1500,
        },
    });

    await prisma.space.create({
        data: {
            id: SPACE_ID,
            floorPlanId: FLOOR_ID,
            name: 'Test Group Room',
            points: '0,0 100,0 100,100 0,100',
            capacity: 4,
            currentQrToken: 'qr-test-space-group',
            type: SpaceType.GROUP_ROOM,
            hasPowerOutlet: true,
            hasComputer: false,
            hasInteractiveBoard: true,
        },
    });

    await prisma.space.create({
        data: {
            id: DESK_ID,
            floorPlanId: FLOOR_ID,
            name: 'Test Desk',
            points: '0,0 50,0 50,50 0,50',
            capacity: 1,
            currentQrToken: 'qr-test-space-desk',
            type: SpaceType.INDIVIDUAL_DESK,
            hasPowerOutlet: true,
        },
    });

    // Active study session hosted by HOST_ID, so guest-side flows have a target
    await prisma.studySession.create({
        data: {
            spaceId: SPACE_ID,
            hostId: HOST_ID,
            status: SessionStatus.ACTIVE,
            expectedEndTime: new Date(Date.now() + 60 * 60 * 1000),
        },
    });

    console.log('Test seed OK.');
    console.log({ HOST_ID, GUEST_ID, SPACE_ID, DESK_ID, FLOOR_ID });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
