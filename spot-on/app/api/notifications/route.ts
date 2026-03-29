/**
 * @fileoverview API route handler for user notifications.
 *
 * Returns actionable notifications for the authenticated user, such as
 * open proof-of-presence alerts tied to the user's active hosted session.
 *
 * @module app/api/notifications/route
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     description: Returns current in-app notifications for the logged-in user.
 *     tags:
 *       - Notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   spaceId:
 *                     type: string
 *                   type:
 *                     type: string
 *                     example: PROOF_OF_PRESENCE
 *                   message:
 *                     type: string
 *                   href:
 *                     type: string
 *       401:
 *         description: Unauthorized - user is not authenticated
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized' }, { status: 401 });
    }
    const activeReport = await prisma.report.findFirst({
        where: {
            session: {
                hostId: session.user.id,
                status: 'ACTIVE',
                expectedEndTime: { gt: new Date() },
            },
            status: 'OPEN',
        },
        select: {
            id: true,
            session: {
                select: { spaceId: true }
            }
        },
    });
    if (!activeReport) {
        return NextResponse.json([]);
    }
    return NextResponse.json([{
        id: activeReport.id,
        spaceId: activeReport.session.spaceId,
        type: 'PROOF_OF_PRESENCE',
        message: 'A tua presença foi questionada! Tens 10 minutos para fazeres scan do QR code ou perdes o lugar.',
        href: `/dashboard`,
    }], { status: 200 });
}
