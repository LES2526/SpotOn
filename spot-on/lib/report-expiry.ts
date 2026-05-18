import { Prisma } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';

type Tx = Prisma.TransactionClient;

function unrefTimer(timer: ReturnType<typeof setTimeout>) {
    timer.unref?.();
}

/**
 * The function `markReportExpired` asynchronously marks a report as expired and penalizes the host if
 * the report is open.
 * @param {string} reportId - The `reportId` parameter is a string that represents the unique
 * identifier of the report that needs to be marked as expired.
 * @param {string} hostId - The `hostId` parameter in the `markReportExpired` function represents the
 * unique identifier of the host who is associated with the report being marked as expired. This
 * identifier is used to perform operations related to handling the expired report, such as penalizing
 * the host for the expired report.
 * @returns This function is returning a Promise that resolves to void (undefined).
 */
export async function markReportExpired(reportId: string, hostId: string): Promise<void> {
    try {
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            select: { status: true, sessionId: true }
        });

        if (!report || report.status !== 'OPEN') return;

        await prisma.$transaction(async (tx: Tx) => {
            await handleExpiredReport(tx, reportId, report.sessionId, hostId);
        });

        console.log(`Report ${reportId} expired, host ${hostId} penalized`);
    } catch (error) {
        console.error(`Failed to expire report ${reportId}:`, error);
    }
}

/**
 * The function `handleExpiredReport` updates the status of a report to 'EXPIRED' and handles the
 * consequences for participants in a study session if no confirmations are received.
 * @param {Tx} tx - The `tx` parameter in the `handleExpiredReport` function represents a transaction
 * object that allows you to perform database operations within a transactional context. This ensures
 * that either all operations within the transaction are successfully committed or rolled back if any
 * operation fails. It helps maintain data integrity and consistency in the database
 * @param {string} reportId - The `reportId` parameter is a string that represents the unique
 * identifier of the report that needs to be handled for expiration.
 * @param {string} sessionId - The `sessionId` parameter in the `handleExpiredReport` function
 * represents the unique identifier of the study session that is associated with the expired report.
 * This parameter is used to identify and update the status of the study session when handling an
 * expired report.
 * @param {string} hostId - The `hostId` parameter in the `handleExpiredReport` function represents the
 * unique identifier of the host user associated with the study session where the report is being
 * handled. This ID is used to identify the host user within the session and perform specific actions
 * based on their participation or confirmation status.
 * @returns The function `handleExpiredReport` returns an object with two properties:
 * 1. `expired`: a boolean value indicating whether the report has expired (true in this case).
 * 2. `sessionEnded`: a boolean value indicating whether the study session has ended (true if no
 * confirmations were found, false otherwise).
 */
export async function handleExpiredReport(tx: Tx, reportId: string,
    sessionId: string, hostId: string) {
    await tx.report.update({
        where: { id: reportId },
        data: { status: 'EXPIRED' }
    });
    const confirmations = await tx.reportConfirmation.findMany({
        where: { reportId },
        orderBy: { confirmedAt: 'asc' },
    });
    if (confirmations.length === 0) {
        await tx.studySession.update({
            where: { id: sessionId },
            data: { status: 'EXPIRED', actualEndTime: new Date() }
        });

        const participants = await tx.userOnStudySession.findMany({
            where: { sessionId }
        });

        const allAbsent = [hostId, ...participants.map(p => p.userId)];

        for (const userId of allAbsent) {
            const user = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
            const penalty = Math.floor((user?.points ?? 0) * 0.1);
            await tx.user.update({ where: { id: userId }, data: { points: { decrement: penalty } } });
        }
        return { expired: true, sessionEnded: true };
    }
    const confirmedUserIds = new Set(confirmations.map(c => c.userId));
    const participants = await tx.userOnStudySession.findMany({
        where: { sessionId }
    });
    const notConfirmed = participants
        .filter(p => !confirmedUserIds.has(p.userId))
        .map(p => p.userId);
    if (notConfirmed.length > 0) {
        await tx.userOnStudySession.deleteMany({
            where: { sessionId, userId: { in: notConfirmed } },
        });
    }
    if (!confirmedUserIds.has(hostId)) {
        await tx.studySession.update({
            where: { id: sessionId },
            data: { hostId: confirmations[0].userId }
        });
    }

    const absentIds = [
        ...notConfirmed,
        ...(!confirmedUserIds.has(hostId) ? [hostId] : [])
    ];

    for (const userId of absentIds) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
        const penalty = Math.floor((user?.points ?? 0) * 0.1);
        await tx.user.update({ where: { id: userId }, data: { points: { decrement: penalty } } });
    }
    return { expired: true, sessionEnded: false };
}

/**
 * The function `scheduleReportExpiry` schedules the expiration of a report based on a specified time
 * to confirm.
 * @param {string} reportId - The `reportId` parameter is a string that represents the unique
 * identifier of the report that needs to be scheduled for expiry.
 * @param {string} hostId - The `hostId` parameter in the `scheduleReportExpiry` function represents
 * the unique identifier of the host who is responsible for confirming the report before it expires.
 * This identifier is used to associate the report with a specific host and ensure that the expiration
 * process is handled correctly based on the host's actions
 * @param {Date} timeToConfirm - The `timeToConfirm` parameter in the `scheduleReportExpiry` function
 * is a `Date` object representing the time at which the report should be confirmed before it expires.
 * @returns The `scheduleReportExpiry` function is not returning anything as it has a return type of
 * `void`. It schedules the expiration of a report based on the provided `timeToConfirm` parameter.
 */
export function scheduleReportExpiry(reportId: string, hostId: string, timeToConfirm: Date): void {
    const delay = timeToConfirm.getTime() - Date.now();

    if (delay <= 0) {
        markReportExpired(reportId, hostId);
        return;
    }
    console.log(`Report ${reportId} scheduled to expire in ${Math.round(delay / 1000)}s`);
    const timer = setTimeout(() => markReportExpired(reportId, hostId), delay);
    unrefTimer(timer);
}

/**
 * The function `restoreReportExpiries` retrieves open reports from a database, logs the count, and
 * schedules expiry timers for each report.
 */
export async function restoreReportExpiries(): Promise<void> {
    try {
        const openReports = await prisma.report.findMany({
            where: { status: 'OPEN' },
            select: { id: true, timeToConfirm: true, session: { select: { hostId: true } } }

        });
        console.log(`Restoring expiry timers for ${openReports.length} open report(s)`);

        for (const report of openReports) {
            scheduleReportExpiry(report.id, report.session.hostId, report.timeToConfirm);
        }
    } catch (error) {
        console.error('Failed to restore report expiries:', error);
    }
}
