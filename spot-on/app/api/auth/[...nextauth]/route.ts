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
import { sendVerificationEmail } from "@/lib/send-notification-email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

/**
 * @swagger
 * /api/auth/signin/email:
 *   post:
 *     summary: Send a magic link sign-in email
 *     description: >
 *       Initiates passwordless authentication by sending a one-time sign-in link
 *       to the provided email address. Only @ualg.pt addresses are accepted.
 *       The link expires after 5 minutes.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - csrfToken
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Institutional UAlg email address
 *                 example: "a12345@ualg.pt"
 *               csrfToken:
 *                 type: string
 *                 description: CSRF token obtained from GET /api/auth/csrf
 *     responses:
 *       302:
 *         description: Redirect to sign-in page with verification message
 *       400:
 *         description: Email not allowed (only @ualg.pt accepted)
 * /api/auth/session:
 *   get:
 *     summary: Get the current session
 *     description: Returns the currently authenticated user's session data, or an empty object if not authenticated.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Current session (empty object if not authenticated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                       nullable: true
 *                     image:
 *                       type: string
 *                       nullable: true
 *                 expires:
 *                   type: string
 *                   format: date-time
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

    pages: {
        signIn: "/auth/signin",
    },

    /**
     * Authentication providers.
     * Currently configured with email-only authentication.
     */
    providers: [
        EmailProvider({
            from: process.env.EMAIL_FROM ?? 'Spot-On UAlg <onboarding@resend.dev>',
            maxAge: 300,
            sendVerificationRequest: async ({ identifier, url }) => {
                await sendVerificationEmail(identifier, url);
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
