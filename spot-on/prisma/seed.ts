import {
    InvitationStatus,
    PrismaClient,
    ReportStatus,
    SessionStatus,
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
            imageUrl: '/images/floorplan-piso0.png',
            imageWidth: 1200,
            imageHeight: 800,
        },
    });

    const floorPlan1 = await prisma.floorPlan.create({
        data: {
            name: 'Piso 1',
            floor: 1,
            imageUrl: '/images/floorplan-piso1.png',
            imageWidth: 1400,
            imageHeight: 900,
        },
    });

    const spacesData = [
        { floorPlanId: floorPlan0.id, name: 'Mesa A1', posX: 10, posY: 20, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-a1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual junto a janela' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A2', posX: 20, posY: 20, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-a2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa individual sem tomada' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A3', posX: 30, posY: 20, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-a3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa silenciosa' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A4', posX: 40, posY: 20, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-a4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual no corredor central' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B1', posX: 10, posY: 40, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-b1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa perto da entrada' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B2', posX: 20, posY: 40, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-b2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa com boa iluminação natural' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B3', posX: 30, posY: 40, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-b3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa em zona de passagem' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B4', posX: 40, posY: 40, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-b4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa no canto tranquilo' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 1', posX: 60, posY: 20, width: 12, height: 10, capacity: 6, qr: 'qr-sala-de-grupo-1', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com quadro branco' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 2', posX: 75, posY: 20, width: 12, height: 10, capacity: 6, qr: 'qr-sala-de-grupo-2', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com ecrã partilhado' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 3', posX: 60, posY: 50, width: 15, height: 12, capacity: 8, qr: 'qr-sala-de-grupo-3', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala ampla para projetos' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 4', posX: 78, posY: 50, width: 15, height: 12, capacity: 8, qr: 'qr-sala-de-grupo-4', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com isolamento acústico' },
        { floorPlanId: floorPlan1.id, name: 'Mesa C1', posX: 15, posY: 22, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-c1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual piso 1' },
        { floorPlanId: floorPlan1.id, name: 'Mesa C2', posX: 25, posY: 22, width: 5, height: 5, capacity: 1, qr: 'qr-mesa-c2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa individual piso 1 sem tomada' },
        { floorPlanId: floorPlan1.id, name: 'Sala de Grupo 5', posX: 65, posY: 30, width: 16, height: 13, capacity: 10, qr: 'qr-sala-de-grupo-5', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala colaborativa piso 1' },
    ];

    const spaces = [];
    for (const s of spacesData) {
        const space = await prisma.space.create({
            data: {
                floorPlanId: s.floorPlanId,
                name: s.name,
                posX: s.posX,
                posY: s.posY,
                width: s.width,
                height: s.height,
                capacity: s.capacity,
                currentQrToken: s.qr,
                type: s.type,
                hasPowerOutlet: s.hasPowerOutlet,
                description: s.description,
            },
        });
        spaces.push(space);
    }

    const usersData = [
        { email: 'a1234@ualg.pt', studentId: 'a1234', points: 120, image: '/images/users/a1234.png' },
        { email: 'alice.occupied@ualg.pt', studentId: 'a2345', points: 85, image: '/images/users/alice.png' },
        { email: 'bruno.host@ualg.pt', studentId: 'a3456', points: 230, image: '/images/users/bruno.png' },
        { email: 'carla.reporter@ualg.pt', studentId: 'a4567', points: 42, image: '/images/users/carla.png' },
        { email: 'diogo.participant@ualg.pt', studentId: 'a5678', points: 57, image: '/images/users/diogo.png' },
        { email: 'eva.pending@ualg.pt', studentId: 'a6789', points: 12, image: '/images/users/eva.png' },
        { email: 'filipe.rejected@ualg.pt', studentId: 'a7890', points: 8, image: '/images/users/filipe.png' },
        { email: 'gabriela.viewer@ualg.pt', studentId: 'a8901', points: 64, image: '/images/users/gabriela.png' },
        { email: 'henrique.mentor@ualg.pt', studentId: 'a9012', points: 310, image: '/images/users/henrique.png' },
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
            spaceId: spaceByName['Mesa C1'].id,
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
