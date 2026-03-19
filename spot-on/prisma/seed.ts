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
    const floorPlan = await prisma.floorPlan.upsert({
        where: { id: '0' },
        update: {},
        create: {
            id: '0',
            name: 'Piso 1',
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
        { floorPlanId: floorPlan0.id, name: 'Mesa A1', points: '476,309 524,309 524,505 476,505',     capacity: 1, qr: 'qr-mesa-a1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true,  description: 'Mesa individual junto a janela' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A2', points: '656,321 703,321 703,470 656,470',     capacity: 1, qr: 'qr-mesa-a2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa individual sem tomada' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A3', points: '900,602 948,602 948,702 900,702',     capacity: 1, qr: 'qr-mesa-a3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true,  description: 'Mesa silenciosa' },
        { floorPlanId: floorPlan0.id, name: 'Mesa A4', points: '1000,602 1052,602 1052,702 1000,702', capacity: 1, qr: 'qr-mesa-a4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true,  description: 'Mesa individual no corredor central' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B1', points: '769,602 821,602 821,650 769,650',     capacity: 1, qr: 'qr-mesa-b1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa perto da entrada' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B2', points: '659,602 707,602 707,650 659,650',     capacity: 1, qr: 'qr-mesa-b2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true,  description: 'Mesa com boa iluminação natural' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B3', points: '1418,904 1519,904 1519,934 1418,934', capacity: 1, qr: 'qr-mesa-b3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa em zona de passagem' },
        { floorPlanId: floorPlan0.id, name: 'Mesa B4', points: '256,218 316,218 316,278 256,278',     capacity: 1, qr: 'qr-mesa-b4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true,  description: 'Mesa no canto tranquilo', shape: SpaceShape.CIRCULAR_DESK },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 1', points: '410,160 494,160 494,271 410,271',     capacity: 6, qr: 'qr-sala-de-grupo-1', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com quadro branco' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 2', points: '501,160 640,160 640,271 501,271',     capacity: 6, qr: 'qr-sala-de-grupo-2', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com ecrã partilhado' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 3', points: '646,148 743,148 742,271 645,271',      capacity: 6, qr: 'qr-sala-de-grupo-3', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 4', points: '748,160 848,160 848,271 748,271',      capacity: 6, qr: 'qr-sala-de-grupo-4', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala ampla para projetos' },
        { floorPlanId: floorPlan0.id, name: 'Sala de Grupo 5', points: '846,160 958,160 958,271 846,271',      capacity: 6, qr: 'qr-sala-de-grupo-5', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala com isolamento acústico' },
        { floorPlanId: floorPlan0.id, name: 'Sala 7',  points: '1306,275 1308,159 1403,158 1490,266 1377,361', capacity: 6, qr: 'qr-sala-7',  type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 8',  points: '1495,272 1577,374 1462,466 1380,367',          capacity: 6, qr: 'qr-sala-8',  type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 9',  points: '1581,379 1663,479 1548,573 1466,471',          capacity: 6, qr: 'qr-sala-9',  type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
        { floorPlanId: floorPlan0.id, name: 'Sala 10', points: '1548,578 1666,485 1750,588 1629,685',          capacity: 6, qr: 'qr-sala-10', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 0' },
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
        console.log(`Mesa individual criada: ${space.name}`);
    }

    // Circular desks
    const circularDesk = await prisma.space.upsert({
        where: { currentQrToken: 'qr-mesa-circular-1' },
        update: { posX: 256, posY: 218, width: 60, height: 60, shape: SpaceShape.CIRCULAR_DESK },
        create: {
            floorPlanId: floorPlan.id,
            name: 'Mesa Circular 1',
            posX: 256,
            posY: 218,
            width: 60,
            height: 60,
            rotation: 0,
            shape: SpaceShape.CIRCULAR_DESK,
            capacity: 1,
            currentQrToken: 'qr-mesa-circular-1',
            type: SpaceType.INDIVIDUAL_DESK,
            hasPowerOutlet: false,
            description: 'Mesa de estudo individual circular',
        },
    });
    console.log(`Mesa circular criada: ${circularDesk.name}`);

    const groupRooms = [
        { name: 'Sala de Grupo 1', posX: 410, posY: 159, width: 84, height: 109, rotation: 0, capacity: 6 },
        { name: 'Sala de Grupo 2', posX: 501, posY: 156, width: 139, height: 112, rotation: 0, capacity: 6 },
        { name: 'Sala de Grupo 3', posX: 748, posY: 154, width: 100, height: 114, rotation: 0, capacity: 6 },
        { name: 'Sala de Grupo 4', posX: 846, posY: 156, width: 112, height: 115, rotation: 0, capacity: 6 },
        { name: 'Sala de Grupo 5', posX: 961, posY: 145, width: 92, height: 125, rotation: 0, capacity: 6 },
        { name: 'Sala de Grupo 6', posX: 1063, posY: 155, width: 124, height: 113, rotation: 0, capacity: 6 },
        { name: 'Sala de Grupo 7', posX: 1192, posY: 160, width: 107, height: 110, rotation: 0, capacity: 6 },
        { name: 'Sala de Grupo 8', posX: 1326, posY: 222, width: 146, height: 100, rotation: -40, capacity: 6 },
    ];

    for (const room of groupRooms) {
        const space = await prisma.space.upsert({
            where: { currentQrToken: `qr-${room.name.toLowerCase().replaceAll(' ', '-')}` },
            update: {
                posX: room.posX,
                posY: room.posY,
                width: room.width,
                height: room.height,
                rotation: room.rotation,
            },
            create: {
                floorPlanId: floorPlan.id,
                name: room.name,
                posX: room.posX,
                posY: room.posY,
                width: room.width,
                height: room.height,
                rotation: room.rotation,
                capacity: room.capacity,
                currentQrToken: `qr-${room.name.toLowerCase().replaceAll(' ', '-')}`,
                type: SpaceType.GROUP_ROOM,
                hasPowerOutlet: true,
                description: `Sala de estudo em grupo para ${room.capacity} pessoas`,
            },
        });
        console.log(`Sala de grupo criada: ${space.name}`);
    }

    console.log('Seed concluído!');
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
