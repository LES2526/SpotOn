import { PrismaClient, SpaceType } from '../app/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');
    const floorPlan = await prisma.floorPlan.upsert({
        where: { id: '0' },
        update: {},
        create: {
            id: '0',
            name: 'Piso 0',
            floor: 0,
            imageUrl: '/images/floorplan-piso0.png',
            imageWidth: 1200,
            imageHeight: 800,
        },
    });

    console.log(`FloorPlan criado: ${floorPlan.name}`);

    // Individual desks
    const individualDesks = [
        { name: 'Mesa A1', posX: 10, posY: 20, width: 5, height: 5 },
        { name: 'Mesa A2', posX: 20, posY: 20, width: 5, height: 5 },
        { name: 'Mesa A3', posX: 30, posY: 20, width: 5, height: 5 },
        { name: 'Mesa A4', posX: 40, posY: 20, width: 5, height: 5 },
        { name: 'Mesa B1', posX: 10, posY: 40, width: 5, height: 5 },
        { name: 'Mesa B2', posX: 20, posY: 40, width: 5, height: 5 },
        { name: 'Mesa B3', posX: 30, posY: 40, width: 5, height: 5 },
        { name: 'Mesa B4', posX: 40, posY: 40, width: 5, height: 5 },
    ];

    for (const desk of individualDesks) {
        const space = await prisma.space.upsert({
            where: { currentQrToken: `qr-${desk.name.toLowerCase().replaceAll(' ', '-')}` },
            update: {},
            create: {
                floorPlanId: floorPlan.id,
                name: desk.name,
                posX: desk.posX,
                posY: desk.posY,
                width: desk.width,
                height: desk.height,
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
        { name: 'Sala de Grupo 1', posX: 60, posY: 20, width: 12, height: 10, capacity: 6 },
        { name: 'Sala de Grupo 2', posX: 75, posY: 20, width: 12, height: 10, capacity: 6 },
        { name: 'Sala de Grupo 3', posX: 60, posY: 50, width: 15, height: 12, capacity: 8 },
        { name: 'Sala de Grupo 4', posX: 78, posY: 50, width: 15, height: 12, capacity: 8 },
    ];

    for (const room of groupRooms) {
        const space = await prisma.space.upsert({
            where: { currentQrToken: `qr-${room.name.toLowerCase().replaceAll(' ', '-')}` },
            update: {},
            create: {
                floorPlanId: floorPlan.id,
                name: room.name,
                posX: room.posX,
                posY: room.posY,
                width: room.width,
                height: room.height,
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
