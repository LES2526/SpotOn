import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// We need to implement logic to delete the session when time expires
export async function POST(
    request: Request,
    { params }: { params: Promise<{ spaceId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const hostId = session.user.id;
        const parameters = await params;

        // Check if space exists
        const space = await prisma.space.findUnique({
            where: { id: parameters.spaceId }
        });
        if (!space) {
            return NextResponse.json(
                { error: 'Space not found' },
                { status: 404 }
            );
        }

        const existingSession = await prisma.studySession.findFirst({
            where: {
                spaceId: parameters.spaceId,
                status: 'ACTIVE'
            }
        });
        if (existingSession) {
            return NextResponse.json(
                { error: 'Space is already occupied' },
                { status: 409 }
            );
        }

        // Create the new session
        const newSession = await prisma.studySession.create({
            data: {
                spaceId: parameters.spaceId,
                hostId,
                expectedEndTime: new Date(Date.now() + 60 * 60 * 1000)
            },
            include: { space: true, host: true }
        });

        return NextResponse.json(newSession, { status: 201 });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json(
            { error: 'Failed to create session' },
            { status: 500 }
        );
    }
}
