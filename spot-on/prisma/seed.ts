import { PrismaClient, SpaceType } from '../app/generated/prisma';

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

    // Individual desks
    const individualDesks = [
    
        { name: 'Mesa1', posX: 1418, posY: 904, width: 101, height: 30, rotation: 0, capacity: 4 },
        { name: 'Mesa2', posX: 476, posY: 309, width: 48, height: 196, rotation: 0, capacity: 1 },
        { name: 'Mesa3', posX: 656, posY: 321, width: 47, height: 149, rotation: 0, capacity: 1 },
        { name: 'Mesa4', posX: 900, posY: 602, width: 48, height: 100, rotation: 0, capacity: 1 },
        { name: 'Mesa5', posX: 1000, posY: 602, width: 52, height: 100, rotation: 0, capacity: 1 },
        { name: 'Mesa6', posX: 769, posY: 602, width: 52, height: 48, rotation: 0, capacity: 1 },
        { name: 'Mesa7', posX: 659, posY: 602, width: 48, height: 48, rotation: 0, capacity: 1 },
    ];

    for (const desk of individualDesks) {
        const space = await prisma.space.upsert({
            where: { currentQrToken: `qr-${desk.name.toLowerCase().replaceAll(' ', '-')}` },
            update: {
                posX: desk.posX,
                posY: desk.posY,
                width: desk.width,
                height: desk.height,
            },
            create: {
                floorPlanId: floorPlan.id,
                name: desk.name,
                posX: desk.posX,
                posY: desk.posY,
                width: desk.width,
                height: desk.height,
                rotation: desk.rotation,
                capacity: 1,
                currentQrToken: `qr-${desk.name.toLowerCase().replaceAll(' ', '-')}`,
                type: SpaceType.INDIVIDUAL_DESK,
                hasPowerOutlet: Math.random() > 0.5,
                description: `Mesa de estudo individual ${desk.name}`,
            },
        });
        console.log(`Mesa individual criada: ${space.name}`);
    }

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

main()
    .catch((e) => {
        console.error('Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
