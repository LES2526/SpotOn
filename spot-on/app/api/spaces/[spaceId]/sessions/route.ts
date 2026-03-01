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
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Route parameter type containing the target space identifier.
 *
 * @typedef {Object} Params
 * @property {Promise<{ spaceId: string }>} params - Resolved route parameters
 */
type Params = { params: { spaceId: string } };

/**
 * POST handler — Occupy a study space.
 *
 * Creates a new active study session for the authenticated user in the specified space.
 * Session duration defaults to 1 hour from the time of creation.
 *
 * @param {Request} _request - Incoming HTTP request (unused)
 * @param {Params} params - Route parameters containing the spaceId
 * @returns {Promise<NextResponse>} The created session object with status 201, or an error response
 *
 * @throws {401} If the user is not authenticated
 * @throws {404} If the space does not exist
 * @throws {409} If the space is already occupied
 * @throws {409} If the user already has an active session in another space
 * @throws {500} If an unexpected error occurs
 */
export async function POST(_request: Request, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spaceId } = await params;

        // Verify the space exists
        const space = await prisma.space.findUnique({ where: { id: spaceId } });
        if (!space) {
            return NextResponse.json({ error: 'Space not found' }, { status: 404 });
        }

        // Check if the space is already occupied by an active session
        const spaceOccupied = await prisma.studySession.findFirst({
            where: {
                spaceId, status: 'ACTIVE',
            }
        });
        if (spaceOccupied) {
            return NextResponse.json({ error: 'Space is already occupied' }, { status: 409 });
        }

        // Check if the user already has an active session in another space
        const userOccupied = await prisma.studySession.findFirst({
            where: {
                hostId: session.user.id, status: 'ACTIVE',
            }
        });
        if (userOccupied) {
            return NextResponse.json({ error: 'You already have an active session. Please release it first.' }, { status: 409 });
        }

        // Create the new study session with a 1-hour duration
        const newSession = await prisma.studySession.create({
            data: {
                spaceId,
                hostId: session.user.id,
                expectedEndTime: new Date(Date.now() + 60 * 60 * 1000)
            }
        });

        return NextResponse.json(newSession, { status: 201 });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

/**
 * DELETE handler — Release a study space.
 *
 * Marks the authenticated user's active session in the specified space as COMPLETED,
 * effectively freeing the space for other users.
 *
 * @param {Request} _request - Incoming HTTP request (unused)
 * @param {Params} params - Route parameters containing the spaceId
 * @returns {Promise<NextResponse>} A success response, or an error response
 *
 * @throws {401} If the user is not authenticated
 * @throws {404} If no active session exists for the user in this space
 * @throws {500} If an unexpected error occurs
 *
 * @async
 */
export async function DELETE(_request: Request, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spaceId } = await params;

        // Find the user's active session in this space
        const activeSession = await prisma.studySession.findFirst({
            where: {
                spaceId,
                hostId: session.user.id,
                status: 'ACTIVE'
            }
        });

        if (!activeSession) {
            return NextResponse.json({ error: 'No active session found for this space' }, { status: 404 });
        }

        // Mark the session as completed and set the end time to now
        await prisma.studySession.update({
            where: { id: activeSession.id },
            data: {
                status: 'COMPLETED', actualEndTime: new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error releasing session:', error);
        return NextResponse.json({ error: 'Failed to release session' }, { status: 500 });
    }
}
