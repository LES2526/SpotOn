import { PrismaClient } from '@/app/generated/prisma';
import { NextResponse } from 'next/server';
import { PrismaPg} from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const spaces = await prisma.space.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spaces' },
      { status: 500 }
    );
  }
}