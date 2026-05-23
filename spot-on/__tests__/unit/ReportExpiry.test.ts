/**
 * @jest-environment node
 */

import type { FloorPlan, Space, StudySession, User } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
    handleExpiredReport,
    markReportExpired,
    restoreReportExpiries,
    scheduleReportExpiry,
} from '@/lib/report-expiry';

describe('ReportExpiry', () => {
    let testFloorPlan: FloorPlan;
    let testSpace: Space;
    let hostUser: User;
    let participant1: User;
    let participant2: User;
    let activeSession: StudySession;

    beforeAll(async () => {
        testFloorPlan = await prisma.floorPlan.create({
            data: {
                name: 'Expiry Test Floor',
                floor: 2,
                imageUrl: '/expiry-test.png',
                imageWidth: 1000,
                imageHeight: 800,
            },
        });

        testSpace = await prisma.space.create({
            data: {
                floorPlanId: testFloorPlan.id,
                name: 'Expiry Test Room',
                points: '100,100 200,100 200,200 100,200',
                capacity: 4,
                currentQrToken: `qr-expiry-${Date.now()}`,
                hasPowerOutlet: false,
            },
        });

        hostUser = await prisma.user.create({
            data: { email: `expiry-host-${Date.now()}@ualg.pt`, points: 1000 },
        });
        participant1 = await prisma.user.create({
            data: { email: `expiry-p1-${Date.now()}@ualg.pt`, points: 500 },
        });
        participant2 = await prisma.user.create({
            data: { email: `expiry-p2-${Date.now()}@ualg.pt`, points: 200 },
        });
    });

    beforeEach(async () => {
        // Reset points
        await prisma.user.update({ where: { id: hostUser.id }, data: { points: 1000 } });
        await prisma.user.update({ where: { id: participant1.id }, data: { points: 500 } });
        await prisma.user.update({ where: { id: participant2.id }, data: { points: 200 } });

        activeSession = await prisma.studySession.create({
            data: {
                spaceId: testSpace.id,
                hostId: hostUser.id,
                expectedEndTime: new Date(Date.now() + 3600000),
                status: 'ACTIVE',
            },
        });

        await prisma.userOnStudySession.createMany({
            data: [
                { userId: participant1.id, sessionId: activeSession.id },
                { userId: participant2.id, sessionId: activeSession.id },
            ],
        });
    });

    afterEach(async () => {
        const sessions = await prisma.studySession.findMany({
            where: { spaceId: testSpace.id },
            select: { id: true },
        });
        const sessionIds = sessions.map(s => s.id);

        const reportIds = (
            await prisma.report.findMany({
                where: { sessionId: { in: sessionIds } },
                select: { id: true },
            })
        ).map(r => r.id);

        await prisma.reportConfirmation.deleteMany({ where: { reportId: { in: reportIds } } });
        await prisma.report.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await prisma.userOnStudySession.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await prisma.studySession.deleteMany({ where: { spaceId: testSpace.id } });
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    afterAll(async () => {
        await prisma.space.delete({ where: { id: testSpace.id } });
        await prisma.floorPlan.delete({ where: { id: testFloorPlan.id } });
        await prisma.user.deleteMany({
            where: { id: { in: [hostUser.id, participant1.id, participant2.id] } },
        });
        await prisma.$disconnect();
    });

    // ============================================================
    // handleExpiredReport
    // ============================================================

    describe('handleExpiredReport', () => {
        it('sem confirmações → sessão EXPIRED, host e todos os participantes penalizados 10%', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: participant1.id,
                    sessionId: activeSession.id,
                    reason: 'Teste expiração',
                },
            });

            await prisma.$transaction(async tx => {
                await handleExpiredReport(tx, report.id, activeSession.id, hostUser.id);
            });

            const updatedReport = await prisma.report.findUnique({ where: { id: report.id } });
            expect(updatedReport?.status).toBe('EXPIRED');

            const updatedSession = await prisma.studySession.findUnique({ where: { id: activeSession.id } });
            expect(updatedSession?.status).toBe('EXPIRED');
            expect(updatedSession?.actualEndTime).not.toBeNull();

            const updatedHost = await prisma.user.findUnique({ where: { id: hostUser.id } });
            expect(updatedHost?.points).toBe(900); // 1000 - 10%

            const updatedP1 = await prisma.user.findUnique({ where: { id: participant1.id } });
            expect(updatedP1?.points).toBe(450); // 500 - 10%

            const updatedP2 = await prisma.user.findUnique({ where: { id: participant2.id } });
            expect(updatedP2?.points).toBe(180); // 200 - 10%
        });

        it('host confirmou, participantes ausentes → só ausentes penalizados, sessão continua', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: participant2.id,
                    sessionId: activeSession.id,
                    reason: 'Host presente',
                },
            });

            await prisma.reportConfirmation.create({
                data: { reportId: report.id, userId: hostUser.id },
            });

            await prisma.$transaction(async tx => {
                await handleExpiredReport(tx, report.id, activeSession.id, hostUser.id);
            });

            const updatedSession = await prisma.studySession.findUnique({ where: { id: activeSession.id } });
            expect(updatedSession?.status).toBe('ACTIVE');

            const updatedHost = await prisma.user.findUnique({ where: { id: hostUser.id } });
            expect(updatedHost?.points).toBe(1000); // não penalizado

            const updatedP1 = await prisma.user.findUnique({ where: { id: participant1.id } });
            expect(updatedP1?.points).toBe(450); // 500 - 10%

            const updatedP2 = await prisma.user.findUnique({ where: { id: participant2.id } });
            expect(updatedP2?.points).toBe(180); // 200 - 10%
        });

        it('host ausente, p1 confirmou → host penalizado, hostId passa para p1', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: participant2.id,
                    sessionId: activeSession.id,
                    reason: 'Host ausente',
                },
            });

            await prisma.reportConfirmation.create({
                data: { reportId: report.id, userId: participant1.id },
            });

            await prisma.$transaction(async tx => {
                await handleExpiredReport(tx, report.id, activeSession.id, hostUser.id);
            });

            const updatedHost = await prisma.user.findUnique({ where: { id: hostUser.id } });
            expect(updatedHost?.points).toBe(900); // penalizado

            const updatedP1 = await prisma.user.findUnique({ where: { id: participant1.id } });
            expect(updatedP1?.points).toBe(500); // não penalizado

            const updatedSession = await prisma.studySession.findUnique({ where: { id: activeSession.id } });
            expect(updatedSession?.hostId).toBe(participant1.id);
            expect(updatedSession?.status).toBe('ACTIVE');
        });

        it('todos confirmaram → ninguém penalizado, sessão continua com host original', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: participant2.id,
                    sessionId: activeSession.id,
                    reason: 'Todos presentes',
                },
            });

            await prisma.reportConfirmation.createMany({
                data: [
                    { reportId: report.id, userId: hostUser.id },
                    { reportId: report.id, userId: participant1.id },
                    { reportId: report.id, userId: participant2.id },
                ],
            });

            await prisma.$transaction(async tx => {
                await handleExpiredReport(tx, report.id, activeSession.id, hostUser.id);
            });

            const updatedHost = await prisma.user.findUnique({ where: { id: hostUser.id } });
            expect(updatedHost?.points).toBe(1000);

            const updatedP1 = await prisma.user.findUnique({ where: { id: participant1.id } });
            expect(updatedP1?.points).toBe(500);

            const updatedP2 = await prisma.user.findUnique({ where: { id: participant2.id } });
            expect(updatedP2?.points).toBe(200);

            const updatedSession = await prisma.studySession.findUnique({ where: { id: activeSession.id } });
            expect(updatedSession?.status).toBe('ACTIVE');
            expect(updatedSession?.hostId).toBe(hostUser.id);
        });

        it('retorna { expired: true, sessionEnded: true } sem confirmações', async () => {
            const report = await prisma.report.create({
                data: { reporterId: participant1.id, sessionId: activeSession.id, reason: 'Sem conf' },
            });

            let result: Awaited<ReturnType<typeof handleExpiredReport>>;
            await prisma.$transaction(async tx => {
                result = await handleExpiredReport(tx, report.id, activeSession.id, hostUser.id);
            });

            expect(result!).toEqual({ expired: true, sessionEnded: true });
        });

        it('retorna { expired: true, sessionEnded: false } com confirmações', async () => {
            const report = await prisma.report.create({
                data: { reporterId: participant2.id, sessionId: activeSession.id, reason: 'Com conf' },
            });

            await prisma.reportConfirmation.create({
                data: { reportId: report.id, userId: hostUser.id },
            });

            let result: Awaited<ReturnType<typeof handleExpiredReport>>;
            await prisma.$transaction(async tx => {
                result = await handleExpiredReport(tx, report.id, activeSession.id, hostUser.id);
            });

            expect(result!).toEqual({ expired: true, sessionEnded: false });
        });
    });

    // ============================================================
    // markReportExpired
    // ============================================================

    describe('markReportExpired', () => {
        it('não faz nada se o report não existir', async () => {
            await expect(markReportExpired('non-existent-id', hostUser.id))
                .resolves.toBeUndefined();
        });

        it('não faz nada se o report não estiver OPEN', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: participant1.id,
                    sessionId: activeSession.id,
                    reason: 'Já resolvida',
                    status: 'RESOLVED',
                },
            });

            await markReportExpired(report.id, hostUser.id);

            const unchanged = await prisma.report.findUnique({ where: { id: report.id } });
            expect(unchanged?.status).toBe('RESOLVED');

            const h = await prisma.user.findUnique({ where: { id: hostUser.id } });
            expect(h?.points).toBe(1000); // inalterado
        });

        it('expira o report e penaliza todos quando OPEN sem confirmações', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: participant1.id,
                    sessionId: activeSession.id,
                    reason: 'Teste markExpired',
                    status: 'OPEN',
                },
            });

            await markReportExpired(report.id, hostUser.id);

            const updated = await prisma.report.findUnique({ where: { id: report.id } });
            expect(updated?.status).toBe('EXPIRED');

            const updatedSession = await prisma.studySession.findUnique({ where: { id: activeSession.id } });
            expect(updatedSession?.status).toBe('EXPIRED');

            const updatedHost = await prisma.user.findUnique({ where: { id: hostUser.id } });
            expect(updatedHost?.points).toBe(900);
        });
    });

    // ============================================================
    // scheduleReportExpiry
    // ============================================================

    describe('scheduleReportExpiry', () => {
        it('chama markReportExpired imediatamente quando timeToConfirm já passou', async () => {
            const report = await prisma.report.create({
                data: {
                    reporterId: participant1.id,
                    sessionId: activeSession.id,
                    reason: 'Expiração imediata',
                    status: 'OPEN',
                },
            });

            scheduleReportExpiry(report.id, hostUser.id, new Date(Date.now() - 1000));

            // aguarda o tick assíncrono de markReportExpired
            await new Promise(r => setTimeout(r, 100));

            const updated = await prisma.report.findUnique({ where: { id: report.id } });
            expect(updated?.status).toBe('EXPIRED');
        });

        it('não expira imediatamente quando timeToConfirm é no futuro', async () => {
            jest.useFakeTimers();

            const report = await prisma.report.create({
                data: {
                    reporterId: participant1.id,
                    sessionId: activeSession.id,
                    reason: 'Expiração futura',
                    status: 'OPEN',
                },
            });

            scheduleReportExpiry(report.id, hostUser.id, new Date(Date.now() + 60000));

            jest.useRealTimers();

            const notYet = await prisma.report.findUnique({ where: { id: report.id } });
            expect(notYet?.status).toBe('OPEN');
        });
    });

    // ============================================================
    // restoreReportExpiries
    // ============================================================

    describe('restoreReportExpiries', () => {
        beforeEach(async () => {
            // Expire ALL OPEN reports so the timer-count assertions start clean.
            // Within this file, the previous scheduleReportExpiry test leaves an
            // OPEN report on activeSession; parallel files may add others.
            await prisma.report.updateMany({
                where: { status: 'OPEN' },
                data: { status: 'EXPIRED' },
            });
        });

        it('não agenda nada quando não há reports OPEN', async () => {
            // Use fake timers to count how many timers scheduleReportExpiry sets.
            // doNotFake keeps setImmediate/nextTick real so Prisma I/O still works.
            jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });

            await restoreReportExpiries();

            expect(jest.getTimerCount()).toBe(0);
        });

        it('agenda expiry para cada report OPEN existente', async () => {
            const timeToConfirm = new Date(Date.now() + 60000);

            await prisma.report.create({
                data: {
                    reporterId: participant1.id,
                    sessionId: activeSession.id,
                    reason: 'Restore 1',
                    status: 'OPEN',
                    timeToConfirm,
                },
            });
            await prisma.report.create({
                data: {
                    reporterId: participant2.id,
                    sessionId: activeSession.id,
                    reason: 'Restore 2',
                    status: 'OPEN',
                    timeToConfirm,
                },
            });

            jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });

            await restoreReportExpiries();

            // Each OPEN report should have scheduled exactly one expiry timer
            expect(jest.getTimerCount()).toBe(2);
        });
    });
});
