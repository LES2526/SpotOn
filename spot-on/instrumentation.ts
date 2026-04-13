/**
 * @fileoverview Next.js instrumentation hook for server startup logic.
 *
 * This file is automatically picked up by Next.js on server startup.
 * It restores session expiry timers for all active sessions that were
 * in progress when the server last shut down.
 *
 * @see {@link https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation}
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

/**
 * Called once by Next.js when the server starts.
 *
 * Guarded by NEXT_RUNTIME check to ensure Prisma only runs in the
 * Node.js runtime and not in the Edge runtime where it is unsupported.
 * The import is dynamic so that Prisma is never bundled into the Edge runtime.
 */

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { restoreSessionExpiries } = await import('@/lib/session-expiry');
        const { restoreReportExpiries } = await import('@/lib/report-expiry');
        await restoreSessionExpiries();
        await restoreReportExpiries();
    }
}
