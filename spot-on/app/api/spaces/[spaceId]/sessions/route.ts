/**
 * @fileoverview API route handlers for managing study sessions within a specific space.
 *
 * Provides endpoints to occupy and release study spaces.
 * Requires authentication via NextAuth.js session.
 *
 * @module app/api/spaces/[spaceId]/sessions/route
 * @requires next-auth
 * @requires @/lib/prisma
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { calculateCheckoutPoints, incrementPoints, notifyOp } from '@/lib/checkout-utils';
import { clampToClosingTime } from '@/lib/library-hours';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { scheduleSessionExpiry } from '@/lib/session-expiry';
import { findActiveSession, findActiveSessionByHost, findSpace } from '@/lib/space-utils';
import { NextResponse } from 'next/server';

/**
 * Route parameter type containing the target space identifier.
 *
 * @typedef {Object} Params
 * @property {Promise<{ spaceId: string }>} params - Resolved route parameters
 */
type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions:
 *   post:
 *     summary: Occupy a study space
 *     description: Creates a new active study session for the authenticated user in the specified space. Session duration defaults to 1 hour from the time of creation.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space to occupy
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 spaceId:
 *                   type: string
 *                 hostId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [ACTIVE]
 *                 expectedEndTime:
 *                   type: string
 *                   format: date-time
 *                 actualEndTime:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       404:
 *         description: Not Found - Space does not exist
 *       409:
 *         description: Conflict - Space is already occupied or user has an active session in another space
 *       500:
 *         description: Internal Server Error - An unexpected error occurred POST handler — Occupy a study space.
 */
export async function POST(_request: Request, { params }: Params) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = await Promise.resolve(params);
        const space = await findSpace(spaceId);
        if (!space) {
            return NextResponse.json({ error: 'Space not found' }, { status: 404 });
        }
        const spaceOccupied = await findActiveSession(spaceId);
        if (spaceOccupied) {
            return NextResponse.json({ error: 'Space is already occupied' }, { status: 409 });
        }
        const userOccupied = await prisma.studySession.findFirst({
            where: {
                hostId: session.user.id, status: 'ACTIVE',
            }
        });
        if (userOccupied) {
            return NextResponse.json({ error: 'You already have an active session. Please release it first.' }, { status: 409 });
        }
        const newSession = await prisma.studySession.create({
            data: {
                spaceId,
                hostId: session.user.id,
                expectedEndTime: new Date(Date.now() + 60 * 60 * 1000) 
            }
        });

        scheduleSessionExpiry(newSession.id, newSession.expectedEndTime);

        return NextResponse.json(newSession, { status: 201 });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions:
 *   patch:
 *     summary: Update the expected end time of an active session
 *     description: >
 *       Updates the expectedEndTime of the authenticated user's active session
 *       in the specified space. Useful for when a user wants to extend or shorten
 *       their session after occupying a space via QR code.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space whose session should be updated
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
 *                 description: ISO 8601 datetime for when the session should end. Must be in the future.
 *                 example: "2026-03-09T15:00:00.000Z"
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       400:
 *         description: Bad Request - expectedEndTime is in the past or missing
 *       401:
 *         description: Unauthorized - user is not authenticated
 *       404:
 *         description: Not Found - no active session exists for this user in this space
 *       500:
 *         description: Internal Server Error
 */
export async function PATCH(request: Request, { params }: Params) {
    const { expectedEndTime } = await request.json();
    const { spaceId } = await Promise.resolve(params);

    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const activeSession = await findActiveSessionByHost(spaceId, session.user.id);

        if (!activeSession) {
            return NextResponse.json({ error: 'No active session found for this space and user' }, { status: 404 });
        }

        if (new Date(expectedEndTime) <= new Date()) {
            return NextResponse.json(
                { error: 'expectedEndTime must be in the future' },
                { status: 400 },
            );
        }

        const newEndTime = new Date(expectedEndTime);

        const clampedExpectedEndTime = clampToClosingTime(newEndTime);

        const updatedSession = await prisma.studySession.update({
            where: { id: activeSession.id },
            data: { expectedEndTime: clampedExpectedEndTime },
        });

        return NextResponse.json(updatedSession, { status: 200 });
    } catch (error) {
        console.error('Error updating session via QR code:', error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions:
 *   delete:
 *     summary: Release a study space
 *     description: Marks the authenticated user's active session in the specified space as COMPLETED, effectively freeing the space for other users.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space to release
 *     responses:
 *       200:
 *         description: Session ended successfully — points awarded to all participants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pointsAwarded:
 *                   type: number
 *                   description: Points awarded to the host (caller)
 *                   example: 42
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       403:
 *         description: Forbidden - Only the host can end the session for all participants
 *       404:
 *         description: Not Found - No active session exists for the user in this space
 *       500:
 *         description: Internal Server Error - An unexpected error occurred
 */
export async function DELETE(_request: Request, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spaceId } = await Promise.resolve(params);

        const activeSession = await prisma.studySession.findFirst({
            where: { spaceId, hostId: session.user.id, status: 'ACTIVE' },
            include: {
                space: true,
                participants: true,
            },
        });

        if (!activeSession) {
            return NextResponse.json({ error: 'No active session found for this space' }, { status: 404 });
        }

        const { type: spaceType, capacity } = activeSession.space;
        const occupancy = 1 + activeSession.participants.length;
        const hostPoints = calculateCheckoutPoints(activeSession.startTime, spaceType, occupancy, capacity);

        await prisma.$transaction([
            prisma.studySession.update({
                where: { id: activeSession.id },
                data: { status: 'COMPLETED', actualEndTime: new Date() },
            }),
            incrementPoints(session.user.id, hostPoints),
            notifyOp(session.user.id, 'CHECKOUT', `Recebeste ${hostPoints} pontos!`),
            ...activeSession.participants.map(p => {
                const points = calculateCheckoutPoints(p.joinedAt, spaceType, occupancy, capacity);
                return [
                    incrementPoints(p.userId, points),
                    notifyOp(p.userId, 'CHECKOUT', `Recebeste ${points} pontos!`),
                ];
            }).flat(),
        ]);

        return NextResponse.json({ success: true, pointsAwarded: hostPoints });
    } catch (error) {
        console.error('Error releasing session:', error);
        return NextResponse.json({ error: 'Failed to release session' }, { status: 500 });
    }
}
