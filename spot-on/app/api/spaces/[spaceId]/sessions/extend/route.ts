import { isAfterHours } from "@/lib/library-hours";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { scheduleSessionExpiry } from "@/lib/session-expiry";
import { findActiveSessionByHost, findSpace } from "@/lib/space-utils";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions/extend:
 *   patch:
 *     summary: Extend an active study session
 *     description: Extends the expected end time of the current user's active session in the specified space. The new end time cannot exceed 19:30.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space where the session is active
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expectedEndTime
 *             properties:
 *               expectedEndTime:
 *                 type: string
 *                 format: date-time
 *                 description: The new expected end time for the session
 *     responses:
 *       200:
 *         description: Session extended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 expectedEndTime:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request (missing expectedEndTime or time exceeds 19:30)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Space or active session not found
 *       500:
 *         description: Internal server error
 */
export const PATCH = async (_request: Request, { params }: Params) => {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = await Promise.resolve(params);
        const space = await findSpace(spaceId);

        if (!space) {
            return NextResponse.json({ error: 'Space not found' },
                { status: 404 });
        }

        const { expectedEndTime } = await _request.json();
        if (!expectedEndTime) {
            return NextResponse.json(
                { error: 'Expected end time is required' },
                { status: 400 });
        }

        const newEndTime = new Date(expectedEndTime);

        if (isAfterHours(newEndTime)) {
            const closingTime = process.env.LIBRARY_CLOSING_TIME ?? '19:30';
            return NextResponse.json(
                { error: `Is not allowed to extend session beyond ${closingTime}` },
                { status: 400 }
            );
        }



        const studySession = await findActiveSessionByHost(spaceId, session.user.id);

        if (!studySession) {
            return NextResponse.json(
                { error: 'No active session found for this space and user' },
                { status: 404 }
            );
        }

        if (newEndTime <= studySession.expectedEndTime) {
            return NextResponse.json(
                { error: 'New end time must be later than the current end time' },
                { status: 400 }
            );
        }

        const updatedSession = await prisma.studySession.update({
            where: { id: studySession.id },
            data: { expectedEndTime: new Date(expectedEndTime) }
        });

        scheduleSessionExpiry(updatedSession.id, newEndTime);

        return NextResponse.json(updatedSession, { status: 200 });
    } catch (error) {
        console.error('Error extending session:', error);
        return NextResponse.json(
            { error: 'Failed to extend session' },
            { status: 500 }
        );
    }
}
