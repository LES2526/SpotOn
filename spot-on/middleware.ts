/**
 * @fileoverview Next.js middleware for route-level authentication.
 *
 * Runs on every request matching the configured routes before the page loads.
 * Checks for the presence of a NextAuth database session cookie and redirects
 * unauthenticated users to the sign-in page.
 *
 * Note: This middleware only checks for cookie existence. The actual session
 * validity is verified server-side via `getServerSession` in each page or API route.
 *
 * @module middleware
 *
 * @author Spot-On Team
 * @since 1.0.0
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Middleware function executed before rendering protected routes.
 *
 * Reads the NextAuth session cookie (`next-auth.session-token` for HTTP,
 * `__Secure-next-auth.session-token` for HTTPS) and redirects to the
 * sign-in page if absent, preserving the original URL as `callbackUrl`.
 *
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {NextResponse} Either a redirect to sign-in or passes the request through
 */
export function middleware(request: NextRequest) {
    const sessionToken =
        request.cookies.get('next-auth.session-token')?.value ||
        request.cookies.get('__Secure-next-auth.session-token')?.value;
    if (!sessionToken) {
        const signInUrl = new URL('/api/auth/signin', request.url);
        signInUrl.searchParams.set('callbackUrl',
            request.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
}

/**
 * Route matcher configuration.
 *
 * Restricts this middleware to protected application routes only.
 * Public routes (e.g. `/`, `/api/auth/*`, `/qrcode/*`) are not affected.
 */
export const config = {
    matcher: ['/dashboard/:path*', '/profile/:path*', '/spaces/:path*'],
};
