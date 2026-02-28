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

import { isEmailAllowed } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

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
     * Uses JSON Web Tokens (JWT) for stateless session management.
     * Sessions are stored client-side and verified on each request.
     *  @see {@link https://next-auth.js.org/configuration/options#session | Session Configuration}
     */
    session: {
        strategy: "jwt",
    },

    /**
     * Authentication providers.
     * Currently configured with email-only authentication.
     */
    providers: [
        EmailProvider({
            /**
             * SMTP server configuration for sending magic links.
             * Uses Gmail SMTP by default.
             *
             * @constant {Object|string}
             * @see {@link https://nodemailer.com/smtp/|Nodemailer SMTP Configuration}
             */
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: Number(process.env.EMAIL_SERVER_PORT),
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM,
            /**
             * Token expiration time in seconds.
             * Set to 5 minutes (300 seconds) for security.
             *
             * @constant {number}
             * @default 300
             */
            maxAge: 300,
        }),
    ],

    /**
     * Authentication callbacks.
     */
    callbacks: {
        /**
         * Sign-in callback to validate email domain.
         *
         * Only allows authentication if the user's email ends with @ualg.pt.
         *
         * @param {Object} params - Callback parameters
         * @param {User} params.user - The user attempting to sign in
         * @returns {Promise<boolean>} `true` to allow sign-in, `false` to deny
         *
         * @async
         */
        async signIn({ user }) {
            const isAllowed = isEmailAllowed(user.email);
            if (!isAllowed) {
                console.warn(
                    `Denied login attempt for email: ${user.email}`);
                return false;
            }
        
            // Extrair o prefixo do email (ex: "a84100" de "a84100@ualg.pt")
            const emailPrefix = user.email!.split("@")[0];

            // se o prefixo for "a" seguido de dígitos, é um aluno — guardar o número na BD
            if (/^a\d+$/.test(emailPrefix)) {
                await prisma.user.updateMany({
                    where: { id: user.id, studentId: null },
                    data: { studentId: emailPrefix.slice(1) },
                });
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) token.id = user.id;
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id as string;
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
