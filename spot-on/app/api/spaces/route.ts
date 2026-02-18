import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

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
