import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { clampToClosingTime } from '@/lib/library-hours';
import { prisma } from '@/lib/prisma';
import { type VerifyResult, verifyQrCode } from '@/lib/qr-utils';
import { scheduleSessionExpiry } from '@/lib/session-expiry';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function handleQrVerification(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { spaceId, qrWindow, sig, expectedEndTime } =
            await request.json();
        const qrCode: VerifyResult =
            verifyQrCode(spaceId, qrWindow, sig);
        if (qrCode.valid === false) {
            return NextResponse.json(
                { error: qrCode.reason }, { status: 400 });
        }
        let rawEndTime = expectedEndTime
            ? new Date(expectedEndTime)
            : new Date(Date.now() + 60 * 60 * 1000);
        const spaceOccupied = await prisma.studySession.findFirst({
            where: { spaceId: qrCode.spaceId, status: 'ACTIVE' },
        });
        if (spaceOccupied) {
            if (spaceOccupied.hostId === session.user.id) {
                const activeReport = await prisma.report.findFirst({
                    where: {
                        sessionId: spaceOccupied.id,
                        status: 'OPEN',
                        timeToConfirm: { gt: new Date() },
                    },
                });
                if (activeReport) {
                    await prisma.report.update({
                        where: { id: activeReport.id },
                        data: {
                            status: 'RESOLVED',
                            confirmedAt: new Date(),
                        },
                    });
                    return NextResponse.json({ message: 'Confirmed Presence' }, { status: 200 });
                }

                return NextResponse.json({ message: 'Session already active' }, { status: 200 });
            }
            return NextResponse.json({ error: 'Space is already occupied' }, { status: 409 });

        }
        const userOccupied = await prisma.studySession.findFirst({
            where: { hostId: session.user.id, status: 'ACTIVE' },
        });
        if (userOccupied) {
            return NextResponse.json(
                { error: 'You already have an active session. Please release it first.' },
                { status: 409 },
            );
        }
        if (rawEndTime <= new Date()) {
            return NextResponse.json(
                { error: 'expectedEndTime must be in the future' },
                { status: 400 },
            );
        }
        rawEndTime = clampToClosingTime(rawEndTime);
        const newSession = await prisma.studySession.create({
            data: {
                spaceId: qrCode.spaceId,
                hostId: session.user.id,
                expectedEndTime: rawEndTime,
            },
        });
        scheduleSessionExpiry(newSession.id, rawEndTime);
        return NextResponse.json(newSession, { status: 201 });
    } catch (error) {
        console.error('Error creating session via QR code:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
