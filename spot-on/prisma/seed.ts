import {
    PrismaClient,
    ReportStatus,
    SessionStatus,
    SpaceShape,
    SpaceType,
} from '../app/generated/prisma';
import { getAvatarForUser } from '../lib/avatar-utils';

const prisma = new PrismaClient();

// ============================================================
// CLEANUP
// ============================================================

async function cleanup() {
    await prisma.notification.deleteMany({});
    await prisma.userBadge.deleteMany({});
    await prisma.reportConfirmation.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.userOnStudySession.deleteMany({});
    await prisma.joinRequest.deleteMany({});
    await prisma.studySession.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.verificationToken.deleteMany({});
    await prisma.space.deleteMany({});
    await prisma.floorPlan.deleteMany({});
    await prisma.badge.deleteMany({});
    await prisma.user.deleteMany({});
}

// ============================================================
// FLOOR PLANS & SPACES
// ============================================================

const piso0SpacesData = [
    { name: 'Mesa A1', points: '476,309 524,309 524,505 476,505', capacity: 1, qr: 'qr-mesa-a1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual junto a janela' },
    { name: 'Mesa A2', points: '656,321 703,321 703,470 656,470', capacity: 1, qr: 'qr-mesa-a2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa individual sem tomada' },
    { name: 'Mesa A3', points: '900,602 948,602 948,702 900,702', capacity: 1, qr: 'qr-mesa-a3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa silenciosa' },
    { name: 'Mesa A4', points: '1000,602 1052,602 1052,702 1000,702', capacity: 4, qr: 'qr-mesa-a4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual no corredor central' },
    { name: 'Mesa B1', points: '769,602 821,602 821,650 769,650', capacity: 1, qr: 'qr-mesa-b1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa perto da entrada' },
    { name: 'Mesa B2', points: '659,602 707,602 707,650 659,650', capacity: 1, qr: 'qr-mesa-b2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa com boa iluminação natural' },
    { name: 'Mesa B4', points: '256,218 316,218 316,278 256,278', capacity: 1, qr: 'qr-mesa-b4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa no canto tranquilo', shape: SpaceShape.CIRCULAR_DESK },
    { name: 'Sala de Grupo 1', points: '410,160 494,160 494,271 410,271', capacity: 6, qr: 'qr-sala-de-grupo-1', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com quadro branco' },
    { name: 'Sala de Grupo 2', points: '501,160 640,160 640,271 501,271', capacity: 6, qr: 'qr-sala-de-grupo-2', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com ecrã partilhado' },
    { name: 'Sala de Grupo 3', points: '646,148 743,148 742,271 645,271', capacity: 6, qr: 'qr-sala-de-grupo-3', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala de Grupo 4', points: '748,160 848,160 848,271 748,271', capacity: 6, qr: 'qr-sala-de-grupo-4', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala ampla para projetos' },
    { name: 'Sala de Grupo 5', points: '846,160 958,160 958,271 846,271', capacity: 6, qr: 'qr-sala-de-grupo-5', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com isolamento acústico' },
    { name: 'Sala 7', points: '1306,275 1308,159 1403,158 1490,266 1377,361', capacity: 6, qr: 'qr-sala-7', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 8', points: '1495,272 1577,374 1462,466 1380,367', capacity: 6, qr: 'qr-sala-8', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 9', points: '1581,379 1663,479 1548,573 1466,471', capacity: 6, qr: 'qr-sala-9', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 10', points: '1548,578 1666,485 1750,588 1629,685', capacity: 6, qr: 'qr-sala-10', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 11', points: '1637,684 1753,592 1862,726 1790,785 1719,785', capacity: 6, qr: 'qr-sala-11', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 12', points: '1804,790 1804,866 1894,938 1984,826 1889,718', capacity: 6, qr: 'qr-sala-12', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 13', points: '1752,1065 1637,973 1719,872 1790,872 1862,930', capacity: 6, qr: 'qr-sala-13', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 14', points: '1551,1078 1634,976 1749,1070 1666,1172', capacity: 6, qr: 'qr-sala-14', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 15', points: '1465,1185 1548,1084 1661,1180 1580,1279', capacity: 6, qr: 'qr-sala-15', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    { name: 'Sala 16', points: '1379,1291 1462,1190 1577,1283 1493,1384', capacity: 6, qr: 'qr-sala-16', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
];

const piso1SpacesData = [
    { name: 'Mesa P1-02', points: '768,114 819,114 819,214 768,214', capacity: 1, qr: 'qr-mesa-p1-02', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-03', points: '885,114 936,114 936,214 885,214', capacity: 1, qr: 'qr-mesa-p1-03', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-04', points: '985,114 1036,114 1036,214 985,214', capacity: 1, qr: 'qr-mesa-p1-04', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-05', points: '1249,114 1300,114 1300,214 1249,214', capacity: 1, qr: 'qr-mesa-p1-05', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-06', points: '1399,114 1450,114 1450,214 1399,214', capacity: 1, qr: 'qr-mesa-p1-06', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-07', points: '1648,114 1699,114 1699,214 1648,214', capacity: 1, qr: 'qr-mesa-p1-07', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-08', points: '1759,114 1810,114 1810,214 1759,214', capacity: 1, qr: 'qr-mesa-p1-08', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-09', points: '1859,114 1910,114 1910,214 1859,214', capacity: 1, qr: 'qr-mesa-p1-09', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-12', points: '887,278 936,278 936,427 887,427', capacity: 1, qr: 'qr-mesa-p1-12', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-13', points: '1130,278 1180,278 1180,427 1130,427', capacity: 1, qr: 'qr-mesa-p1-13', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-14', points: '1325,302 1376,302 1376,402 1325,402', capacity: 1, qr: 'qr-mesa-p1-14', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-15', points: '1700,278 1749,278 1749,427 1700,427', capacity: 1, qr: 'qr-mesa-p1-15', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-19', points: '202,583 252,583 252,740 202,740', capacity: 1, qr: 'qr-mesa-p1-19', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-21', points: '202,856 252,856 252,1013 202,1013', capacity: 1, qr: 'qr-mesa-p1-21', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-25', points: '202,1170 252,1170 252,1327 202,1327', capacity: 1, qr: 'qr-mesa-p1-25', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-34', points: '929,1430 979,1430 979,1579 929,1579', capacity: 1, qr: 'qr-mesa-p1-34', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-35', points: '1112,1459 1161,1459 1161,1559 1112,1559', capacity: 1, qr: 'qr-mesa-p1-35', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-36', points: '1317,1429 1367,1429 1367,1578 1317,1578', capacity: 1, qr: 'qr-mesa-p1-36', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-37', points: '1514,1459 1563,1459 1563,1559 1514,1559', capacity: 1, qr: 'qr-mesa-p1-37', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-38', points: '1719,1428 1769,1428 1769,1577 1719,1577', capacity: 1, qr: 'qr-mesa-p1-38', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-40', points: '868,1630 917,1630 917,1730 868,1730', capacity: 1, qr: 'qr-mesa-p1-40', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-41', points: '997,1630 1046,1630 1046,1730 997,1730', capacity: 1, qr: 'qr-mesa-p1-41', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-42', points: '1249,1630 1298,1630 1298,1730 1249,1730', capacity: 1, qr: 'qr-mesa-p1-42', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-43', points: '1389,1630 1438,1630 1438,1730 1389,1730', capacity: 1, qr: 'qr-mesa-p1-43', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-44', points: '1653,1630 1702,1630 1702,1730 1653,1730', capacity: 1, qr: 'qr-mesa-p1-44', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-45', points: '1770,1630 1819,1630 1819,1730 1770,1730', capacity: 1, qr: 'qr-mesa-p1-45', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
    { name: 'Mesa P1-46', points: '1891,1630 1940,1630 1940,1730 1891,1730', capacity: 1, qr: 'qr-mesa-p1-46', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa piso 1' },
];

async function seedFloorPlansAndSpaces() {
    const floorPlan0 = await prisma.floorPlan.create({
        data: {
            name: 'Piso 0',
            floor: 0,
            imageUrl: '/PISO_1.svg',
            imageWidth: 2074,
            imageHeight: 1593,
        },
    });

    const floorPlan1 = await prisma.floorPlan.create({
        data: {
            name: 'Piso 1',
            floor: 1,
            imageUrl: '/PISO_2.svg',
            imageWidth: 2853,
            imageHeight: 1835,
        },
    });

    const spaces = [];
    for (const s of piso0SpacesData) {
        const space = await prisma.space.create({
            data: {
                floorPlanId: floorPlan0.id,
                name: s.name,
                points: s.points,
                capacity: s.capacity,
                currentQrToken: s.qr,
                type: s.type,
                hasPowerOutlet: s.hasPowerOutlet,
                description: s.description,
                shape: s.shape ?? null,
            },
        });
        spaces.push(space);
    }

    for (const s of piso1SpacesData) {
        const space = await prisma.space.create({
            data: {
                floorPlanId: floorPlan1.id,
                name: s.name,
                points: s.points,
                capacity: s.capacity,
                currentQrToken: s.qr,
                type: s.type,
                hasPowerOutlet: s.hasPowerOutlet,
                description: s.description,
            },
        });
        spaces.push(space);
    }

    return spaces;
}

// ============================================================
// USERS, ACCOUNTS, SESSIONS
// ============================================================

const usersData = [
    { email: 'a1234@ualg.pt', studentId: 'a1234', points: 120 },
    { email: 'alice.occupied@ualg.pt', studentId: 'a2345', points: 85 },
    { email: 'tsmachado40@gmail.com', studentId: null, points: 0 },
    { email: 'tsmachado255@gmail.com', studentId: null, points: 0 },
    { email: 'bruno.host@ualg.pt', studentId: 'a3456', points: 230 },
    { email: 'carla.reporter@ualg.pt', studentId: 'a4567', points: 42 },
    { email: 'diogo.participant@ualg.pt', studentId: 'a5678', points: 57 },
    { email: 'eva.pending@ualg.pt', studentId: 'a6789', points: 12 },
    { email: 'filipe.rejected@ualg.pt', studentId: 'a7890', points: 8 },
    { email: 'gabriela.viewer@ualg.pt', studentId: 'a8901', points: 64 },
    { email: 'henrique.mentor@ualg.pt', studentId: 'a9012', points: 310 },
    { email: 'isabel.new@ualg.pt', studentId: null, points: 0 },
];

async function seedUsersAndAuth(now: Date) {
    const users = [];
    for (const u of usersData) {
        users.push(
            await prisma.user.create({
                data: {
                    email: u.email,
                    studentId: u.studentId,
                    points: u.points,
                    image: getAvatarForUser(u.email),
                    emailVerified: now,
                },
            })
        );
    }

    const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

    await prisma.account.createMany({
        data: [
            {
                userId: userByEmail['a1234@ualg.pt'].id,
                type: 'email',
                provider: 'email',
                providerAccountId: 'a1234@ualg.pt',
            },
            {
                userId: userByEmail['alice.occupied@ualg.pt'].id,
                type: 'email',
                provider: 'email',
                providerAccountId: 'alice.occupied@ualg.pt',
            },
            {
                userId: userByEmail['bruno.host@ualg.pt'].id,
                type: 'oauth',
                provider: 'google',
                providerAccountId: 'google-bruno-host',
                access_token: 'seed-google-token-bruno',
                token_type: 'Bearer',
                scope: 'openid email profile',
            },
            {
                userId: userByEmail['carla.reporter@ualg.pt'].id,
                type: 'oauth',
                provider: 'github',
                providerAccountId: 'github-carla-reporter',
                access_token: 'seed-github-token-carla',
                token_type: 'Bearer',
                scope: 'read:user user:email',
            },
        ],
    });

    await prisma.session.createMany({
        data: [
            {
                sessionToken: 'seed-session-a1234',
                userId: userByEmail['a1234@ualg.pt'].id,
                expires: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
            },
            {
                sessionToken: 'seed-session-bruno',
                userId: userByEmail['bruno.host@ualg.pt'].id,
                expires: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3),
            },
            {
                sessionToken: 'seed-session-carla',
                userId: userByEmail['carla.reporter@ualg.pt'].id,
                expires: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2),
            },
        ],
    });

    await prisma.verificationToken.createMany({
        data: [
            {
                identifier: 'isabel.new@ualg.pt',
                token: 'seed-magic-token-isabel',
                expires: new Date(now.getTime() + 1000 * 60 * 5),
            },
            {
                identifier: 'gabriela.viewer@ualg.pt',
                token: 'seed-magic-token-gabriela',
                expires: new Date(now.getTime() + 1000 * 60 * 4),
            },
        ],
    });

    return userByEmail;
}

// ============================================================
// STUDY SESSIONS, REPORTS, BADGES
// ============================================================

async function seedSessionsAndReports(
    userByEmail: Record<string, { id: string }>,
    spaceByName: Record<string, { id: string }>,
    now: Date,
) {
    const activeA1 = await prisma.studySession.create({
        data: {
            spaceId: spaceByName['Mesa A1'].id,
            hostId: userByEmail['a1234@ualg.pt'].id,
            startTime: new Date(now.getTime() - 1000 * 60 * 20),
            expectedEndTime: new Date(now.getTime() + 1000 * 60 * 40),
            status: SessionStatus.ACTIVE,
        },
    });

    await prisma.studySession.create({
        data: {
            spaceId: spaceByName['Mesa A4'].id,
            hostId: userByEmail['tsmachado40@gmail.com'].id,
            startTime: new Date(now.getTime() - 1000 * 60 * 10),
            expectedEndTime: new Date(now.getTime() + 1000 * 60 * 45),
            status: SessionStatus.ACTIVE,
        },
    });

    await prisma.studySession.create({
    data: {
        spaceId: spaceByName['Mesa A3'].id,
        hostId: userByEmail['tsmachado255@gmail.com'].id,
        startTime: new Date(now.getTime() - 1000 * 60 * 20),
        expectedEndTime: new Date(now.getTime() + 1000 * 60 * 12),
        status: SessionStatus.ACTIVE,
    },
    });

    const activeB2 = await prisma.studySession.create({
        data: {
            spaceId: spaceByName['Mesa B2'].id,
            hostId: userByEmail['alice.occupied@ualg.pt'].id,
            startTime: new Date(now.getTime() - 1000 * 60 * 12),
            expectedEndTime: new Date(now.getTime() + 1000 * 60 * 50),
            status: SessionStatus.ACTIVE,
        },
    });

    const activeGroup = await prisma.studySession.create({
        data: {
            spaceId: spaceByName['Sala de Grupo 1'].id,
            hostId: userByEmail['bruno.host@ualg.pt'].id,
            startTime: new Date(now.getTime() - 1000 * 60 * 35),
            expectedEndTime: new Date(now.getTime() + 1000 * 60 * 55),
            status: SessionStatus.ACTIVE,
        },
    });

    const completedSession = await prisma.studySession.create({
        data: {
            spaceId: spaceByName['Sala de Grupo 2'].id,
            hostId: userByEmail['henrique.mentor@ualg.pt'].id,
            startTime: new Date(now.getTime() - 1000 * 60 * 180),
            expectedEndTime: new Date(now.getTime() - 1000 * 60 * 120),
            actualEndTime: new Date(now.getTime() - 1000 * 60 * 110),
            status: SessionStatus.COMPLETED,
        },
    });

    const expiredSession = await prisma.studySession.create({
        data: {
            spaceId: spaceByName['Mesa B1'].id,
            hostId: userByEmail['gabriela.viewer@ualg.pt'].id,
            startTime: new Date(now.getTime() - 1000 * 60 * 140),
            expectedEndTime: new Date(now.getTime() - 1000 * 60 * 80),
            actualEndTime: new Date(now.getTime() - 1000 * 60 * 60),
            status: SessionStatus.EXPIRED,
        },
    });

    await prisma.userOnStudySession.createMany({
        data: [
            {
                userId: userByEmail['diogo.participant@ualg.pt'].id,
                sessionId: activeGroup.id,
            },
            {
                userId: userByEmail['carla.reporter@ualg.pt'].id,
                sessionId: activeA1.id,
            },
        ],
    });

    await prisma.joinRequest.createMany({
        data: [
            {
                userId: userByEmail['eva.pending@ualg.pt'].id,
                studySessionId: activeGroup.id,
                spaceId: spaceByName['Sala de Grupo 1'].id,
                status: 'PENDING',
            },
            {
                userId: userByEmail['filipe.rejected@ualg.pt'].id,
                studySessionId: activeGroup.id,
                spaceId: spaceByName['Sala de Grupo 1'].id,
                status: 'REJECTED',
            },
        ],
    });

    await prisma.report.createMany({
        data: [
            {
                reporterId: userByEmail['carla.reporter@ualg.pt'].id,
                sessionId: activeB2.id,
                reason: 'Mesa marcada como ocupada, mas vazia há mais de 10 minutos.',
                status: ReportStatus.OPEN,
                timeToConfirm: new Date(now.getTime() + 1000 * 60 * 10),
            },
            {
                reporterId: userByEmail['diogo.participant@ualg.pt'].id,
                sessionId: completedSession.id,
                reason: 'Sala estava sinalizada como ocupada após saída do grupo.',
                status: ReportStatus.RESOLVED,
                timeToConfirm: new Date(now.getTime() - 1000 * 60 * 30),
                confirmedAt: new Date(now.getTime() - 1000 * 60 * 35),
            },
            {
                reporterId: userByEmail['isabel.new@ualg.pt'].id,
                sessionId: expiredSession.id,
                reason: 'Sessão não confirmada dentro da janela de tempo.',
                status: ReportStatus.EXPIRED,
                timeToConfirm: new Date(now.getTime() - 1000 * 60 * 50),
            },
        ],
    });

    await prisma.badge.createMany({
        data: [
            {
                name: 'First Session',
                description: 'Completed your first study session',
                iconUrl: '/badges/first-session.png',
                month: 0,
                year: 0,
            },
            {
                name: 'Study Streak',
                description: 'Studied 5 days in a row',
                iconUrl: '/badges/study-streak.png',
                month: 0,
                year: 0,
            },
        ],
        skipDuplicates: true,
    });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log('Seeding database...');
    await cleanup();

    const now = new Date();
    const spaces = await seedFloorPlansAndSpaces();
    const userByEmail = await seedUsersAndAuth(now);
    const spaceByName = Object.fromEntries(spaces.map((s) => [s.name, s]));

    await seedSessionsAndReports(userByEmail, spaceByName, now);

    const counts = await Promise.all([
        prisma.user.count(),
        prisma.account.count(),
        prisma.session.count(),
        prisma.verificationToken.count(),
        prisma.floorPlan.count(),
        prisma.space.count(),
        prisma.studySession.count(),
        prisma.userOnStudySession.count(),
        prisma.report.count(),
    ]);

    console.log('Seed completed successfully!');
    console.log(`Users: ${counts[0]}`);
    console.log(`Accounts: ${counts[1]}`);
    console.log(`Sessions (NextAuth): ${counts[2]}`);
    console.log(`VerificationTokens: ${counts[3]}`);
    console.log(`FloorPlans: ${counts[4]}`);
    console.log(`Spaces: ${counts[5]}`);
    console.log(`StudySessions: ${counts[6]}`);
    console.log(`Participations: ${counts[7]}`);
    console.log(`Reports: ${counts[8]}`);
}

async function runSeed() {
    try {
        await main();
    } catch (e) {
        console.error('Error in seed:', e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

void runSeed();
