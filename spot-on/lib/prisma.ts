/**
 * @fileoverview Prisma Client singleton instance.
 *
 * Ensures a single Prisma Client instance is used throughout the application
 * to prevent connection pool exhaustion during development hot-reloading.
 *
 * @module lib/prisma
 * @requires @prisma/client
 * @requires @prisma/adapter-pg
 *
 * @see {@link https://www.prisma.io/docs/guides/performance-and-optimization/connection-management|Connection Management}
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { PrismaClient as PrismaClientType } from "@/app/generated/prisma";

/**
 * Global augmentation for Prisma Client instance.
 *
 * Stores the Prisma Client instance in the global scope during development
 * to prevent creating multiple instances on hot-reload.
 *
 * @global
 */
declare global {
    var prisma: PrismaClientType | undefined;
}

/**
 * Prisma Client singleton instance.
 *
 * In development, reuses the global instance to prevent connection pool exhaustion.
 * In production, creates a new instance for each cold start.
 *
 * @constant {PrismaClientType}
 * @public
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma';
 *
 * const users = await prisma.user.findMany();
 * ```
 */
export const prisma =
    globalThis.prisma ||
    new PrismaClientType();

/**
 * Store Prisma Client in global scope during development.
 *
 * Prevents creating multiple instances when Next.js hot-reloads modules.
 * Only runs in development environment (NODE_ENV !== "production").
 */
if (process.env.NODE_ENV !== "production") {
    globalThis.prisma = prisma;
}
