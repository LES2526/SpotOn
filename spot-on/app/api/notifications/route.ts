/**
 * @fileoverview API route handler for user notifications.
 *
 * Returns actionable notifications for the authenticated user, such as
 * open proof-of-presence alerts tied to the user's active hosted session.
 *
 * @module app/api/notifications/route
 */

import { prisma } from "@/lib/prisma";
import type { Notification } from '@/types/notification';
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized' }, { status: 401 });
    }
    const notifications: Notification[] = [];

    // PROOF_OF_PRESENCE — open proof-of-presence reports for the user's active hosted session
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
    if (activeReport) {
        notifications.push({
            id: activeReport.id,
            spaceId: activeReport.session.spaceId,
            type: 'PROOF_OF_PRESENCE',
            message: 'A tua presença foi questionada! Tens 10 minutos para fazeres scan do QR code ou perdes o lugar.',
            href: `/dashboard`,
        });
    }

    // JOIN_REQUEST — pending join requests to the host's active session
    const activeSession = await prisma.studySession.findFirst({
        where: {
            hostId: session.user.id,
            status: 'ACTIVE',
        },
        select: {
            id: true,
            spaceId: true,
        },
    });
    if (activeSession) {
        const pendingParticipants = await prisma.userOnStudySession.findMany({
            where: {
                sessionId: activeSession.id,
                status: 'PENDING',
            },
            include: {
                user: { select: { email: true } },
            },
        });
        for (const participant of pendingParticipants) {
            notifications.push({
                id: `join-${participant.userId}`,
                spaceId: activeSession.spaceId,
                type: 'JOIN_REQUEST',
                message: `${participant.user.email} quer juntar-se à tua sessão.`,
                userId: participant.userId,
                sessionId: activeSession.id,
            });
        }
    }
    return NextResponse.json(notifications);
}
