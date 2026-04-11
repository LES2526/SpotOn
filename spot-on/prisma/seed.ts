import {
    InvitationStatus,
    PrismaClient,
    ReportStatus,
    SessionStatus,
    SpaceShape,
    SpaceType,
} from '../app/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');
    await prisma.report.deleteMany({});
    await prisma.userOnStudySession.deleteMany({});
    await prisma.studySession.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.verificationToken.deleteMany({});
    await prisma.space.deleteMany({});
    await prisma.floorPlan.deleteMany({});
    await prisma.user.deleteMany({});

    const now = new Date();

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
            imageWidth: 2074,
            imageHeight: 1593,
        },
    });

    const spacesData = [
        { floorPlanId: floorPlan0.id, name: 'Mesa A1', points: '476,309 524,309 524,505 476,505', capacity: 1, qr: 'qr-mesa-a1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual junto a janela' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A2', points: '656,321 703,321 703,470 656,470', capacity: 1, qr: 'qr-mesa-a2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa individual sem tomada' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A3', points: '900,602 948,602 948,702 900,702', capacity: 1, qr: 'qr-mesa-a3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa silenciosa' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A4', points: '1000,602 1052,602 1052,702 1000,702', capacity: 1, qr: 'qr-mesa-a4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual no corredor central' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B1', points: '769,602 821,602 821,650 769,650', capacity: 1, qr: 'qr-mesa-b1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa perto da entrada' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B2', points: '659,602 707,602 707,650 659,650', capacity: 1, qr: 'qr-mesa-b2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa com boa iluminação natural' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B3', points: '1418,904 1519,904 1519,934 1418,934', capacity: 1, qr: 'qr-mesa-b3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa em zona de passagem' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B4', points: '256,218 316,218 316,278 256,278', capacity: 1, qr: 'qr-mesa-b4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa no canto tranquilo', shape: SpaceShape.CIRCULAR_DESK },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 1', points: '410,160 494,160 494,271 410,271', capacity: 6, qr: 'qr-sala-de-grupo-1', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com quadro branco' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 2', points: '501,160 640,160 640,271 501,271', capacity: 6, qr: 'qr-sala-de-grupo-2', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com ecrã partilhado' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 3', points: '646,148 743,148 742,271 645,271', capacity: 6, qr: 'qr-sala-de-grupo-3', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 4', points: '748,160 848,160 848,271 748,271', capacity: 6, qr: 'qr-sala-de-grupo-4', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala ampla para projetos' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 5', points: '846,160 958,160 958,271 846,271', capacity: 6, qr: 'qr-sala-de-grupo-5', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com isolamento acústico' },
        { floorPlanId: floorPlan0.id, name: 'Sala 7', points: '1306,275 1308,159 1403,158 1490,266 1377,361', capacity: 6, qr: 'qr-sala-7', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 8', points: '1495,272 1577,374 1462,466 1380,367', capacity: 6, qr: 'qr-sala-8', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 9', points: '1581,379 1663,479 1548,573 1466,471', capacity: 6, qr: 'qr-sala-9', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 10', points: '1548,578 1666,485 1750,588 1629,685', capacity: 6, qr: 'qr-sala-10', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 11', points: '1637,684 1753,592 1862,726 1790,785 1719,785', capacity: 6, qr: 'qr-sala-11', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 12', points: '1804,790 1804,866 1894,938 1984,826 1889,718', capacity: 6, qr: 'qr-sala-12', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 13', points: '1752,1065 1637,973 1719,872 1790,872 1862,930', capacity: 6, qr: 'qr-sala-13', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 14', points: '1551,1078 1634,976 1749,1070 1666,1172', capacity: 6, qr: 'qr-sala-14', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 15', points: '1465,1185 1548,1084 1661,1180 1580,1279', capacity: 6, qr: 'qr-sala-15', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 16', points: '1379,1291 1462,1190 1577,1283 1493,1384', capacity: 6, qr: 'qr-sala-16', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
    ];

    const spaces = [];
    for (const s of spacesData) {
        const space = await prisma.space.create({
            data: {
                floorPlanId: s.floorPlanId,
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

    const usersData = [
        { email: 'a1234@ualg.pt', studentId: 'a1234', points: 120 },
        { email: 'alice.occupied@ualg.pt', studentId: 'a2345', points: 85 },
        { email: 'tsmachado40@gmail.com', studentId: null, points: 0 },
        { email: 'bruno.host@ualg.pt', studentId: 'a3456', points: 230 },
        { email: 'carla.reporter@ualg.pt', studentId: 'a4567', points: 42 },
        { email: 'diogo.participant@ualg.pt', studentId: 'a5678', points: 57 },
        { email: 'eva.pending@ualg.pt', studentId: 'a6789', points: 12 },
        { email: 'filipe.rejected@ualg.pt', studentId: 'a7890', points: 8 },
        { email: 'gabriela.viewer@ualg.pt', studentId: 'a8901', points: 64 },
        { email: 'henrique.mentor@ualg.pt', studentId: 'a9012', points: 310 },
        { email: 'isabel.new@ualg.pt', studentId: null, points: 0, image: null },
    ];

    const users = [];
    for (const u of usersData) {
        users.push(
            await prisma.user.create({
                data: {
                    email: u.email,
                    studentId: u.studentId,
                    points: u.points,
                    image: u.image,
                    emailVerified: now,
                },
            })
        );
    }

    const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));
    const spaceByName = Object.fromEntries(spaces.map((s) => [s.name, s]));

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
                status: InvitationStatus.ACCEPTED,
            },
            {
                userId: userByEmail['eva.pending@ualg.pt'].id,
                sessionId: activeGroup.id,
                status: InvitationStatus.PENDING,
            },
            {
                userId: userByEmail['filipe.rejected@ualg.pt'].id,
                sessionId: activeGroup.id,
                status: InvitationStatus.REJECTED,
            },
            {
                userId: userByEmail['carla.reporter@ualg.pt'].id,
                sessionId: activeA1.id,
                status: InvitationStatus.ACCEPTED,
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
