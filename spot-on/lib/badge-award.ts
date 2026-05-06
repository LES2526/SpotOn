/**
 * @fileoverview Monthly badge award utilities for Spot-On.
 *
 * Provides functions to award badges to the top 10 users on the leaderboard
 * at the start of each month. Uses setTimeout for precise scheduling and
 * includes catchup logic for server downtime on the 1st of the month.
 *
 * @module lib/badge-award
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';

/**
 * Returns the date of the 1st of next month at midnight.
 */
function getNextFirstOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

/**
 * Awards the monthly badge to the top 10 users by points.
 *
 * Finds the badge matching the current month and year. If no
 * month-specific badge exists, falls back to a generic badge
 * where both month and year are 0.
 *
 * Skips users who already have the badge to prevent duplicates.
 */
export async function awardMonthlyBadges(): Promise<void> {
    try {
        const now = new Date();
        const month = now.getMonth() + 1; // getMonth() is 0-indexed
        const year = now.getFullYear();
        console.log(`Awarding monthly badges for ${month}/${year}`);

        // Find the badge for this month and year
        let badge = await prisma.badge.findFirst({
            where: { month, year },
        });

        // Fall back to a generic badge if no month-specific one exists
        if (!badge) {
            badge = await prisma.badge.findFirst({
                where: { month: 0, year: 0 },
            });
        }

        if (!badge) {
            console.warn('No badge found for monthly award — skipping');
            return;
        }

        // Query top 10 users by points
        const topUsers = await prisma.user.findMany({
            orderBy: { points: 'desc' },
            take: 10,
            select: { id: true, email: true, points: true },
        });

        if (topUsers.length === 0) {
            console.log('No users found for monthly badge award — skipping');
            return;
        }

        // Filter out users who already have this badge to avoid constraint violations
        const existingAwards = await prisma.userBadge.findMany({
            where: { badgeId: badge.id, userId: { in: topUsers.map(u => u.id) } },
            select: { userId: true },
        });
        const alreadyAwarded = new Set(existingAwards.map(b => b.userId));
        const usersToAward = topUsers.filter(u => !alreadyAwarded.has(u.id));

        console.log(`Awarding badge "${badge.name}" to ${usersToAward.length} user(s) (${alreadyAwarded.size} already have it)`);

        for (const user of usersToAward) {
            await prisma.userBadge.create({
                data: { userId: user.id, badgeId: badge.id },
            });
            console.log(`Badge awarded to ${user.email} (${user.points} points)`);
        }

        console.log(`Monthly badge award complete for ${month}/${year}`);
    } catch (error) {
        console.error('Failed to award monthly badges:', error);
    }
}

/**
 * Checks if the monthly badge has already been awarded this month.
 *
 * Used on server startup to detect whether a catchup run is needed
 * in case the server was down on the 1st of the month.
 *
 * @returns true if badges have already been awarded this month
 */
export async function hasMonthlyBadgeBeenAwarded(): Promise<boolean> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const awarded = await prisma.userBadge.findFirst({
        where: {
            badge: { month, year },
            awardedAt: { gte: startOfMonth },
        },
    });

    // Also check generic badge as fallback
    if (!awarded) {
        const awardedGeneric = await prisma.userBadge.findFirst({
            where: {
                badge: { month: 0, year: 0 },
                awardedAt: { gte: startOfMonth },
            },
        });
        return !!awardedGeneric;
    }

    return !!awarded;
}

// Node.js setTimeout only supports 32-bit signed integer delays (~24.8 days max)
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Schedules the monthly badge award to run on the 1st of next month.
 *
 * After awarding badges it reschedules itself for the following month,
 * so it runs indefinitely without needing a cron job.
 *
 * When the delay exceeds the 32-bit setTimeout limit (~24.8 days), it
 * re-checks daily until close enough to schedule precisely.
 */
export function scheduleMonthlyBadgeAward(): void {
    const next = getNextFirstOfMonth();
    const delay = next.getTime() - Date.now();

    console.log(
        `Monthly badge award scheduled for ${next.toISOString()} ` +
        `(in ${Math.round(delay / 1000 / 60)} minutes)`
    );

    if (delay > MAX_TIMEOUT_MS) {
        setTimeout(() => scheduleMonthlyBadgeAward(), ONE_DAY_MS);
        return;
    }

    setTimeout(async () => {
        await awardMonthlyBadges();
        scheduleMonthlyBadgeAward(); // reschedule for next month
    }, delay);
}

/**
 * Initializes the monthly badge award system on server startup.
 *
 * - If today is the 1st and badges haven't been awarded yet, runs immediately (catchup)
 * - Always schedules the next award for the 1st of next month
 *
 * Should be called once on server startup via instrumentation.ts.
 */
export async function initializeBadgeAwardScheduler(): Promise<void> {
    try {
        const now = new Date();
        const isFirstOfMonth = now.getDate() === 1;

        if (isFirstOfMonth) {
            const alreadyAwarded = await hasMonthlyBadgeBeenAwarded();
            if (!alreadyAwarded) {
                console.log('Monthly badge not yet awarded — running catchup');
                await awardMonthlyBadges();
            } else {
                console.log('Monthly badge already awarded this month — skipping catchup');
            }
        }

        scheduleMonthlyBadgeAward();
    } catch (error) {
        console.error('Failed to initialize badge award scheduler:', error);
    }
}
