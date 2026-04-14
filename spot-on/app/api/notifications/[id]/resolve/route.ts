import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/notifications/{id}/resolve:
 *   patch:
 *     summary: Resolve a notification
 *     description: Marks a specific notification as RESOLVED. Only the owner of the notification can resolve it.
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the notification to resolve
 *     responses:
 *       200:
 *         description: Notification resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       401:
 *         description: Unauthorized - user not authenticated
 *       404:
 *         description: Not Found - notification does not exist or belongs to another user
 */
export async function PATCH(_request: Request, { params }: Params) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({
            error: 'Unauthorized'
        }, { status: 401 });
    }
    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== session.user.id) {
        return NextResponse.json({
            error: 'Not found'
        }, { status: 404 });
    }
    await prisma.notification.update({
        where: { id },
        data: { status: 'RESOLVED' },
    });
    return NextResponse.json({ ok: true });
}
