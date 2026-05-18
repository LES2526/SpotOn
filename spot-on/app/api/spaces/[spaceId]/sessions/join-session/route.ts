import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { findActiveSession, findSpace } from "@/lib/space-utils";
import { sendJoinRequestEmail } from "@/lib/send-notification-email";
import { NextResponse } from "next/server";
import { verifyQrCode } from '@/lib/qr-utils';


type Params = { params: Promise<{ spaceId: string }> };

/**
 * @swagger
 * /api/spaces/{spaceId}/sessions/join-session:
 *   post:
 *     summary: Request to join an active study session
 *     description: Creates a pending join request for the authenticated user in the active session for the specified space. Requires a valid QR code scan to prove physical presence.
 *     tags:
 *       - Sessions
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the space whose active session should be joined
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrWindow
 *               - sig
 *             properties:
 *               qrWindow:
 *                 type: number
 *                 description: The time window from the scanned QR code
 *               sig:
 *                 type: string
 *                 description: The HMAC signature from the scanned QR code
 *     responses:
 *       201:
 *         description: Join request created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - invalid or expired QR code
 *       404:
 *         description: Space or active session not found
 *       409:
 *         description: Conflict - session full, user already joined or has pending request
 *       429:
 *         description: Too Many Requests - anti-spam limit exceeded
 *       500:
 *         description: Internal Server Error
 */


export async function POST(_request: Request, { params }: Params) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId } = await Promise.resolve(params);
        const { qrWindow, sig } = await _request.json();
        const verification = verifyQrCode(spaceId, qrWindow, sig);
        if (!verification.valid) {
            return NextResponse.json({ error: 'Invalid QR code' }, { status: 403 });
        }
        const space = await findSpace(spaceId);
        if (!space) {
            return NextResponse.json({ error: 'Space not found' },
                { status: 404 });
        }
        const studySession = await findActiveSession(spaceId);
        if (!studySession) {
            return NextResponse.json({ error: 'Study session not found' },
                { status: 404 });
        }
        const alreadyAHostInAnySession = await prisma.studySession.findFirst({
            where: {
                hostId: session.user.id,
                status: 'ACTIVE'
            }   
        });
        if (alreadyAHostInAnySession) {
            return NextResponse.json({
                error: 'You are already hosting a session. Please release it first.'
            },
                { status: 409 });
        }
        
        const occupancy = await prisma.userOnStudySession.count({
            where: {
                sessionId: studySession.id
            }
        });

        if (occupancy >= space.capacity - 1) {
            return NextResponse.json({
                error: 'This session is already at full capacity.'
            },
                { status: 409 });
        }

        const alreadyJoined = await prisma.userOnStudySession.findFirst({
            where: {
                userId: session.user.id,
                session: {
                    status: 'ACTIVE'
                }
            }
        });
        if (alreadyJoined) {
            return NextResponse.json({
                error: 'You are already part of an active session. Please leave it first.'
            },
                { status: 409 });
        }

        const alreadyRequested = await prisma.joinRequest.findFirst({
            where: {
                userId: session.user.id,
                studySessionId: studySession.id,
                status: 'PENDING'
            }
        });

        if(alreadyRequested) {
            return NextResponse.json({
                error: 'You have already requested to join this session. Please wait for the host to respond.'
            },
                { status: 409 });
        }

        const recentRejections = await prisma.joinRequest.count({
            where: {userId: session.user.id,
                studySessionId: studySession.id,
                createdAt: {
                    gte: new Date(Date.now() - 5 * 60 * 1000)
                }
            }
         });

        if(recentRejections >= 3) {
            return NextResponse.json({
                error: 'Too many recent rejections. Please wait before trying to join again.'
            },
                { status: 429 });
        }

        const joinRequest = await prisma.joinRequest.create({
            data: {
                userId: session.user.id,
                studySessionId: studySession.id,
                spaceId,
                status: 'PENDING'
            }
        });

        await createNotification(
            studySession.hostId,
            'JOIN_REQUEST',
            JSON.stringify({
                text: `${session.user.email} quer juntar-se à tua sessão.`,
                requesterId: session.user.id,
                requesterEmail: session.user.email,
                spaceId,
            }),
        );
        const host = await prisma.user.findUnique({
            where: { id: studySession.hostId },
            select: { email: true },
        });
        if (host?.email && session.user.email) {
            await sendJoinRequestEmail(host.email, session.user.email);
        }
        return NextResponse.json(joinRequest, { status: 201 });
    } catch (error) {
        console.error('Error joining session:', error);
        return NextResponse.json({ error: 'Failed to join session' },
            { status: 500 });
    }
}
