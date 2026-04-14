/**
 * @fileoverview API route handler for user notifications.
 *
 * Returns all PENDING notifications for the authenticated user from the database.
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
 *     summary: Get pending notifications
 *     description: Returns all PENDING notifications for the authenticated user, ordered by creation date descending.
 *     tags:
 *       - Notifications
 *     responses:
 *       200:
 *         description: List of pending notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [PROOF_OF_PRESENCE, JOIN_REQUEST]
 *                   status:
 *                     type: string
 *                     enum: [PENDING]
 *                   message:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - user not authenticated
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized' }, { status: 401 });
    }
    const notifications = await prisma.notification.findMany({
        where: {
            userId: session.user.id,
            status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notifications);
}
