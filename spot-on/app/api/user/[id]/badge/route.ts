/**
 * @fileoverview API route for awarding badges to users.
 *
 * @module app/api/user/[id]/badges/route
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { NextResponse } from 'next/server';

type Params = { params: { id: string } };

/**
 * @swagger
 * /api/user/{id}/badges:
 *   post:
 *     summary: Award a badge to a user
 *     description: >
 *       Awards a badge to the specified user. Returns 409 if the user
 *       already has the badge.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user's database ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - badgeId
 *             properties:
 *               badgeId:
 *                 type: string
 *                 description: The badge's database ID
 *                 example: "abc123"
 *     responses:
 *       201:
 *         description: Badge awarded successfully
 *       400:
 *         description: Bad Request - badgeId is missing
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       404:
 *         description: Not Found - user or badge does not exist
 *       409:
 *         description: Conflict - user already has this badge
 *       500:
 *         description: Internal Server Error
 */
export async function POST(request: Request, { params }: Params) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const { badgeId } = body;

        if (!badgeId) {
            return NextResponse.json({ error: 'badgeId is required' }, { status: 400 });
        }

        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify badge exists
        const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
        if (!badge) {
            return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
        }

        // Check if user already has this badge
        const existing = await prisma.userBadge.findUnique({
            where: { userId_badgeId: { userId: id, badgeId } },
        });
        if (existing) {
            return NextResponse.json({ error: 'User already has this badge' }, { status: 409 });
        }

        const userBadge = await prisma.userBadge.create({
            data: { userId: id, badgeId },
        });

        return NextResponse.json(userBadge, { status: 201 });
    } catch (error) {
        console.error('Error awarding badge:', error);
        return NextResponse.json({ error: 'Failed to award badge' }, { status: 500 });
    }
}

