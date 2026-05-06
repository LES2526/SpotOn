import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions/current:
 *   get:
 *     summary: Get the current active session for a space
 *     description: Returns the active study session for the specified space, if one exists.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space
 *     responses:
 *       200:
 *         description: Active session found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active session found for this space
 *       500:
 *         description: Internal server error
 */
export const GET = async (_request: Request, { params }: Params) => {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spaceId } = await params;

        const studySession = await prisma.studySession.findFirst({
            where: { spaceId, status: 'ACTIVE' },
            select: { expectedEndTime: true },
        });

        if (!studySession) {
            return NextResponse.json(
                { error: 'No active session found for this space' },
                { status: 404 }
            );
        }

        return NextResponse.json(studySession);
    } catch (error) {
        console.error('Error fetching current session:', error);
        return NextResponse.json(
            { error: 'Failed to fetch current session' },
            { status: 500 }
        );
    }
};