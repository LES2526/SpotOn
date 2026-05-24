/**
 * @fileoverview NextAuth.js authentication configuration for Spot-On application.
 *
 * Implements email-based passwordless authentication with domain restriction
 * to allow only @ualg.pt institutional email addresses.
 *
 * @module app/api/auth/[...nextauth]/route
 * @requires next-auth
 * @requires @next-auth/prisma-adapter
 * @requires @/lib/prisma
 *
 * @see {@link https://next-auth.js.org/|NextAuth.js Documentation}
 * @see {@link https://next-auth.js.org/providers/email|Email Provider Documentation}
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import { extractStudentId, isEmailAllowed } from "@/lib/auth-utils";
import { getAvatarForUser } from "@/lib/avatar-utils";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";

/**
 * @swagger
 * /api/auth/{...nextauth}:
 *   get:
 *     summary: NextAuth authentication endpoint
 *     description: Handles authentication callbacks, session retrieval, and sign-in flows for the application.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Authentication response
 *   post:
 *     summary: NextAuth authentication endpoint
 *     description: Handles authentication callbacks, session retrieval, and sign-in flows for the application.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Authentication response
 */

/**
 * NextAuth.js configuration options.
 *
 * Configures:
 * - Prisma adapter for database persistence
 * - Database session strategy
 * - Email provider with 5-minute token expiration
 * - Domain validation callback for @ualg.pt restriction
 *
 * @constant {NextAuthOptions}
 * @public
 */
export const authOptions: NextAuthOptions = {
    /**
     * Prisma adapter for storing users, sessions, and tokens in PostgreSQL.
     *
     * @see {@link https://next-auth.js.org/adapters/prisma|Prisma Adapter Documentation}
     */
    adapter: PrismaAdapter(prisma),

    /**
     * Session strategy configuration.
     *
     * Uses database-backed sessions for persistent session management.
     * Sessions are stored server-side in the database and verified on each request.
     * @see {@link https://next-auth.js.org/configuration/options#session | Session Configuration}
     */
    session: {
        strategy: "database",
    },

    /**
     * Authentication providers.
     * Currently configured with email-only authentication.
     */
    providers: [
        EmailProvider({
            from: process.env.EMAIL_FROM ?? 'Spot-On UAlg <onboarding@resend.dev>',
            maxAge: 300,
            sendVerificationRequest: async ({ identifier, url, provider }) => {
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: provider.from,
                    to: identifier,
                    subject: 'Entrar no Spot-On',
                    html: `
                        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#111;color:#e5e7eb;border-radius:12px">
                            <h2 style="margin:0 0 8px;font-size:22px;color:#fff">Entrar no Spot-On</h2>
                            <p style="margin:0 0 24px;color:#9ca3af">Clica no botão abaixo para aceder à tua conta. O link expira em <strong style="color:#e5e7eb">5 minutos</strong>.</p>
                            <a href="${url}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Entrar na conta</a>
                            <p style="margin:24px 0 0;font-size:12px;color:#6b7280">Se não pediste este email, podes ignorá-lo com segurança.</p>
                        </div>
                    `,
                });
            },
        }),
    ],

    /**
     * Authentication callbacks.
     */
    callbacks: {
        async signIn({ user }) {
            const isAllowed = isEmailAllowed(user.email);
            if (!isAllowed) {
                console.warn(`Denied login attempt for email: ${user.email}`);
                return false;
            }
            return true;
        },

        async session({ session, user }) {
            session.user.id = user.id;
            const updates: { studentId?: string; image?: string } = {};
            if (!user.studentId) {
                const studentId = extractStudentId(user.email);
                if (studentId) {
                    updates.studentId = studentId;
                }
            }
            if (!user.image) {
                updates.image = getAvatarForUser(user.email);
            }
            if (Object.keys(updates).length > 0) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: updates,
                });
            }
            return session;
        },
    },
};

/**
 * NextAuth.js handler instance.
 *
 * Handles all authentication-related HTTP requests.
 *
 * @constant
 * @private
 */
const handler = NextAuth(authOptions);

/**
 * GET handler for NextAuth.js routes.
 * Handles authentication callbacks, session retrieval, etc.
 *
 * @function GET
 * @public
 */
export { handler as GET };

/**
 * POST handler for NextAuth.js routes.
 * Handles sign-in requests, sign-out, etc.
 *
 * @function POST
 * @public
 */
export { handler as POST };
