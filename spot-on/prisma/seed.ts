import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg} from "@prisma/adapter-pg"
import { randomBytes } from 'crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter });

async function main() {

  // apagar dados existentes 
  await prisma.session.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany();

  // Criar utilizador de teste
  const testUser = await prisma.user.create({
    data: {
      email: 'aluno@exemplo.com',
      name: 'João Silva',
      password: 'hashed_password_aqui', // bycript?
    },
  });

  console.log('User created:', testUser.email);

  // Criar espaços de estudo
  const spaces = [
    {
      name: 'Mesa 1',
      location: 'Biblioteca - Piso 1',
      capacity: 1,
      description: 'Mesa individual com tomada',
    },
    {
      name: 'Mesa 2',
      location: 'Biblioteca - Piso 1',
      capacity: 1,
      description: 'Mesa individual perto da janela',
    },
    {
      name: 'Mesa 3',
      location: 'Biblioteca - Piso 1',
      capacity: 1,
      description: 'Mesa individual',
    },
    {
      name: 'Sala A',
      location: 'Biblioteca - Piso 2',
      capacity: 4,
      description: 'Sala de estudo em grupo',
    },
    {
      name: 'Sala B',
      location: 'Biblioteca - Piso 2',
      capacity: 6,
      description: 'Sala de estudo em grupo com quadro',
    },
    {
      name: 'Sala C',
      location: 'Edifício B - Piso 1',
      capacity: 8,
      description: 'Sala grande com quadro',
    },
  ];

  for (const spaceData of spaces) {
    const space = await prisma.space.create({
      data: {
        ...spaceData,
        currentQrToken: randomBytes(16).toString('hex'), // Gerar token único para QR
        isOccupied: Math.random() > 0.7, // 30% ocupadas aleatoriamente
      },
    });

    console.log(`Space created: ${space.name} (${space.location})`);
  }

  // algumas sessões de exemplo
  const allSpaces = await prisma.space.findMany();  //findMany() é um SELECT FROM
  const occupiedSpaces = allSpaces.filter((s) => s.isOccupied);

  for (const space of occupiedSpaces.slice(0, 2)) {
    await prisma.session.create({
      data: {
        userId: testUser.id,
        spaceId: space.id,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Começou há 30 minutos
      },
    });
    console.log(`Session created for space: ${space.name}`);
  }

  console.log('Database seed completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });