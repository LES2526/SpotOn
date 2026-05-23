import { PrismaClient, SpaceShape, SpaceType } from '../app/generated/prisma';

const prisma = new PrismaClient();

// ============================================================
// PISO 0 — PISO_1.svg (2074x1593)
// ============================================================

const piso0 = {
    name: 'Piso 0',
    floor: 0,
    imageUrl: '/PISO_1.svg',
    imageWidth: 2074,
    imageHeight: 1593,
};

const piso0Spaces = [
    { name: 'Mesa A1', points: '476,309 524,309 524,505 476,505', capacity: 1, qr: 'qr-mesa-a1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual junto a janela' },
    { name: 'Mesa A2', points: '656,321 703,321 703,470 656,470', capacity: 1, qr: 'qr-mesa-a2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa individual sem tomada' },
    { name: 'Mesa A3', points: '900,602 948,602 948,702 900,702', capacity: 1, qr: 'qr-mesa-a3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa silenciosa' },
    { name: 'Mesa A4', points: '1000,602 1052,602 1052,702 1000,702', capacity: 1, qr: 'qr-mesa-a4', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa individual no corredor central' },
    { name: 'Mesa B1', points: '769,602 821,602 821,650 769,650', capacity: 1, qr: 'qr-mesa-b1', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa perto da entrada' },
    { name: 'Mesa B2', points: '659,602 707,602 707,650 659,650', capacity: 1, qr: 'qr-mesa-b2', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: true, description: 'Mesa com boa iluminação natural' },
    { name: 'Mesa B3', points: '1418,904 1519,904 1519,934 1418,934', capacity: 1, qr: 'qr-mesa-b3', type: SpaceType.INDIVIDUAL_DESK, hasPowerOutlet: false, description: 'Mesa em zona de passagem' },
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

// ============================================================
// PISO 1 — PISO_2.svg (2853x1835)
// ============================================================

const piso1 = {
    name: 'Piso 1',
    floor: 1,
    imageUrl: '/PISO_2.svg',
    imageWidth: 2853,
    imageHeight: 1835,
};

const piso1Spaces = [
    { name: 'Sala 101', points: '497,102 684,102 684,332 497,332', capacity: 3, qr: 'qr-sala-101', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo piso 1' },
    { name: 'Sala 102', points: '748,94 1056,94 1056,447 748,447', capacity: 9, qr: 'qr-sala-102', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo ampla piso 1' },
    { name: 'Sala 103', points: '1110,94 1320,94 1320,447 1110,447', capacity: 5, qr: 'qr-sala-103', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo piso 1' },
    { name: 'Sala 104', points: '1628,94 1930,94 1930,447 1628,447', capacity: 9, qr: 'qr-sala-104', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo ampla piso 1' },
    { name: 'Sala 105', points: '1995,131 2332,131 2332,491 1995,491', capacity: 8, qr: 'qr-sala-105', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo piso 1' },
    { name: 'Sala 106', points: '1967,462 2202,462 2202,703 1967,703', capacity: 4, qr: 'qr-sala-106', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 1' },
    { name: 'Sala 107', points: '182,563 272,563 272,760 182,760', capacity: 3, qr: 'qr-sala-107', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala pequena piso 1' },
    { name: 'Sala 108', points: '2358,552 2693,552 2693,910 2358,910', capacity: 7, qr: 'qr-sala-108', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo piso 1' },
    { name: 'Sala 109', points: '182,836 272,836 272,1033 182,1033', capacity: 3, qr: 'qr-sala-109', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala pequena piso 1' },
    { name: 'Sala 110', points: '1980,926 2235,926 2235,1369 1980,1369', capacity: 9, qr: 'qr-sala-110', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo ampla piso 1' },
    { name: 'Sala 111', points: '182,1150 272,1150 272,1347 182,1347', capacity: 3, qr: 'qr-sala-111', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala pequena piso 1' },
    { name: 'Sala 112', points: '596,1138 831,1138 831,1570 596,1570', capacity: 10, qr: 'qr-sala-112', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo ampla piso 1' },
    { name: 'Sala 113', points: '2386,1062 2579,1062 2579,1302 2386,1302', capacity: 3, qr: 'qr-sala-113', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de grupo piso 1' },
    { name: 'Sala 114', points: '1989,1337 2340,1337 2340,1717 1989,1717', capacity: 9, qr: 'qr-sala-114', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo ampla piso 1' },
    { name: 'Sala 115', points: '848,1410 1066,1410 1066,1750 848,1750', capacity: 7, qr: 'qr-sala-115', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo piso 1' },
    { name: 'Sala 116', points: '1229,1409 1458,1409 1458,1750 1229,1750', capacity: 7, qr: 'qr-sala-116', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo piso 1' },
    { name: 'Sala 117', points: '1633,1408 1839,1408 1839,1750 1633,1750', capacity: 7, qr: 'qr-sala-117', type: SpaceType.GROUP_ROOM, hasPowerOutlet: true, description: 'Sala de estudo piso 1' },
];

// ============================================================
// UPSERT
// ============================================================

async function upsertFloorAndSpaces(
    floorData: typeof piso0,
    spacesData: typeof piso0Spaces,
) {
    const floorPlan = await prisma.floorPlan.upsert({
        where: { floor: floorData.floor },
        update: {
            imageUrl: floorData.imageUrl,
            imageWidth: floorData.imageWidth,
            imageHeight: floorData.imageHeight,
        },
        create: floorData,
    });

    for (const s of spacesData) {
        await prisma.space.upsert({
            where: { currentQrToken: s.qr },
            update: {
                name: s.name,
                points: s.points,
                capacity: s.capacity,
                type: s.type,
                hasPowerOutlet: s.hasPowerOutlet,
                description: s.description,
                shape: (s as { shape?: SpaceShape }).shape ?? null,
            },
            create: {
                floorPlanId: floorPlan.id,
                name: s.name,
                points: s.points,
                capacity: s.capacity,
                currentQrToken: s.qr,
                type: s.type,
                hasPowerOutlet: s.hasPowerOutlet,
                description: s.description,
                shape: (s as { shape?: SpaceShape }).shape ?? null,
            },
        });
    }

    console.log(`  ${floorData.name}: ${spacesData.length} spaces upserted`);
}

async function main() {
    console.log('Seeding floors and spaces...');
    await upsertFloorAndSpaces(piso0, piso0Spaces);
    await upsertFloorAndSpaces(piso1, piso1Spaces);
    console.log('Done — no existing users or sessions were affected.');
}

async function run() {
    try {
        await main();
    } catch (e) {
        console.error('Error:', e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

void run();
