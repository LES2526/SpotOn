/**
 * @fileoverview API route handler for the leaderboard.
 *
 * Returns a ranked list of users ordered by points (descending).
 * Requires authentication via NextAuth.js session.
 *
 * @module app/api/leaderboard/route
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
 * A single entry in the leaderboard response.
 *
 * @typedef {Object} LeaderboardEntry
 * @property {number} rank - Position in the leaderboard
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string | null} image - User avatar URL
 * @property {number} points - Total points accumulated
 */
export type LeaderboardEntry = {
    rank: number;
    id: string;
    email: string;
    image: string | null;
    points: number;
};

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     summary: Get the leaderboard
 *     description: Returns a ranked list of users ordered by points descending. Requires authentication.
 *     tags:
 *       - Leaderboard
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       500:
 *         description: Internal Server Error - An unexpected error occurred
 */

/**
 * GET handler — Retrieve the leaderboard.
 *
 * Returns all users ordered by points descending, each with their rank position.
 *
 * @param {Request} _request - Incoming HTTP request (unused)
 * @returns {Promise<NextResponse>} Array of leaderboard entries, or an error response
 *
 * @throws {401} If the user is not authenticated
 * @throws {500} If an unexpected error occurs
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const users = await prisma.user.findMany({
            orderBy: { points: 'desc' },
            select: {
                id: true,
                email: true,
                image: true,
                points: true,
            },
        });
        const leaderboard: LeaderboardEntry[] = users.map((user, index) => ({
            rank: index + 1,
            ...user,
        }));

        return NextResponse.json(leaderboard, { status: 200 });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
