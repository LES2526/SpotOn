import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { findActiveSessionByHost, findSpace } from "@/lib/space-utils";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/reports/active:
 *   get:
 *     summary: Get the open report for the authenticated user's active session
 *     description: |
 *       Returns the currently open report object for the authenticated user's
 *       active session in the specified space, if any. If there is no active
 *       session for the user or no open report, the endpoint returns `report: null`.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space to query
 *     responses:
 *       200:
 *         description: Report retrieved successfully (or null when none exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   oneOf:
 *                     - type: object
 *                       description: The open report object
 *                     - type: 'null'
 *       401:
 *         description: Unauthorized - user not authenticated
 *       404:
 *         description: Not Found - space not found
 *       500:
 *         description: Internal Server Error
 */
export const GET = async (_request: Request, props: Params) => {
    const session = await requireAuth();
    if (!session) {
        return NextResponse.json(
            { error: 'Unauthorized' }, { status: 401 });
    }
    const params = await props.params;
    const { spaceId } = params;
    const space = await findSpace(spaceId);
    if (!space) {
        return NextResponse.json({ error: 'Space not found' },
            { status: 404 });
    }
    const activeSession = await findActiveSessionByHost(spaceId, session.user.id);
    if (!activeSession) {
        return NextResponse.json({ report: null }, { status: 200 });
    }
    const report = await prisma.report.findFirst({
        where: { sessionId: activeSession.id, status: 'OPEN' }
    });
    return NextResponse.json({ report }, { status: 200 });
}
