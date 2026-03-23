import { PrismaClient, SpaceType, SpaceShape } from '../app/generated/prisma';

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
    const floorPlan2 = await prisma.floorPlan.upsert({
    where: { id: '2' },
    update: {},
    create: {
        id: '2',
        name: 'Piso 2',
        floor: 1,
        imageUrl: '/PISO_2.svg',
        imageWidth: 2074,
        imageHeight: 1593,
    },
});

    console.log(`FloorPlan criado: ${floorPlan.name}`);

    // Individual desks — points: "x1,y1 x2,y2 x3,y3 x4,y4" clockwise from top-left
    const individualDesks = [
        { name: 'Mesa1', points: '1418,904 1519,904 1519,934 1418,934', capacity: 4 },
        { name: 'Mesa2', points: '476,309 524,309 524,505 476,505',     capacity: 1 },
        { name: 'Mesa3', points: '656,321 703,321 703,470 656,470',     capacity: 1 },
        { name: 'Mesa4', points: '900,602 948,602 948,702 900,702',     capacity: 1 },
        { name: 'Mesa5', points: '1000,602 1052,602 1052,702 1000,702', capacity: 1 },
        { name: 'Mesa6', points: '769,602 821,602 821,650 769,650',     capacity: 1 },
        { name: 'Mesa7', points: '659,602 707,602 707,650 659,650',     capacity: 1 },
    ];

    for (const desk of individualDesks) {
        const space = await prisma.space.upsert({
            where: { currentQrToken: `qr-${desk.name.toLowerCase().replaceAll(' ', '-')}` },
            update: { points: desk.points },
            create: {
                floorPlanId: floorPlan.id,
                name: desk.name,
                points: desk.points,
                capacity: desk.capacity,
                currentQrToken: `qr-${desk.name.toLowerCase().replaceAll(' ', '-')}`,
                type: SpaceType.INDIVIDUAL_DESK,
                hasPowerOutlet: Math.random() > 0.5,
                description: `Mesa de estudo individual ${desk.name}`,
            },
        });
        console.log(`Mesa individual criada: ${space.name}`);
    }

    // Circular desks — bounding box corners (cx/cy/rx/ry derived at render time)
    const circularDesk = await prisma.space.upsert({
        where: { currentQrToken: 'qr-mesa-circular-1' },
        update: { points: '256,218 316,218 316,278 256,278', shape: SpaceShape.CIRCULAR_DESK },
        create: {
            floorPlanId: floorPlan.id,
            name: 'Mesa Circular 1',
            points: '256,218 316,218 316,278 256,278',
            shape: SpaceShape.CIRCULAR_DESK,
            capacity: 1,
            currentQrToken: 'qr-mesa-circular-1',
            type: SpaceType.INDIVIDUAL_DESK,
            hasPowerOutlet: false,
            description: 'Mesa de estudo individual circular',
        },
    });
    console.log(`Mesa circular criada: ${circularDesk.name}`);

    // Group rooms
    const groupRooms = [
        { name: 'Sala de Grupo 1', points: '410,160 494,160 494,271 410,271',     capacity: 6 },
        { name: 'Sala de Grupo 2', points: '501,160 640,160 640,271 501,271',     capacity: 6 },
        { name: 'Sala de Grupo 3', points: '748,160 848,160 848,271 748,271',     capacity: 6 },
        { name: 'Sala de Grupo 4', points: '846,160 958,160 958,271 846,271',     capacity: 6 },
        { name: 'Sala de Grupo 5', points: '961,160 1053,160 1053,271 961,271',   capacity: 6 },
        { name: 'Sala de Grupo 6', points: '1063,160 1187,160 1187,271 1063,271', capacity: 6 },
        { name: 'Sala de Grupo 7', points: '1192,160 1299,160 1299,271 1192,271', capacity: 6 },
        { name: 'Sala de Grupo 8', points: '1305,160 1403,160 1488,261 1375,367 1303,274', capacity: 6 },
    ];

    for (const room of groupRooms) {
        const space = await prisma.space.upsert({
            where: { currentQrToken: `qr-${room.name.toLowerCase().replaceAll(' ', '-')}` },
            update: { points: room.points },
            create: {
                floorPlanId: floorPlan.id,
                name: room.name,
                points: room.points,
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

main()
    .catch((e) => {
        console.error('Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
