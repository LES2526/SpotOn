/**
 * NextAuth.js Middleware for Route Protection
 *
 * This middleware intercepts requests to protected routes and verifies
 * user authentication status before allowing access. Unauthenticated
 * users are automatically redirected to the sign-in page.
 *
 * @module proxy
 * @see {@link https://next-auth.js.org/configuration/nextjs#middleware | NextAuth Middleware Documentation}
 *
 * @example
 * Protect all routes under /qrcode/
 * export const config = {
 *   matcher: ["/qrcode/:path*"]
 * }
 *
 * @example
 * User tries to access protected route
 * GET /qrcode/scan → 307 Redirect → /api/auth/signin?callbackUrl=%2Fqrcode%2Fscan
 */

import { withAuth } from "next-auth/middleware";

/**
 * NextAuth middleware instance with custom configuration.
 *
 * Wraps routes matched by the config matcher and enforces authentication.
 * Redirects unauthenticated requests to the configured sign-in page.
 *
 * @type {NextMiddleware}
 */
export default withAuth({
    /**
     * Custom pages configuration for authentication flow.
     *
     * @property {string} signIn - URL to redirect unauthenticated users
     */
    pages: {
        signIn: "/api/auth/signin",
    },
});

/**
 * Middleware configuration defining which routes require authentication.
 *
 * Uses Next.js path matching patterns to specify protected routes.
 * Routes matching these patterns will be intercepted by the middleware.
 *
 * @type {Object}
 * @property {string[]} matcher - Array of path patterns to protect
 *
 * @example
 * Pattern syntax:
 * "/qrcode/:path*"     → Matches /qrcode, /qrcode/scan, /qrcode/generate, etc.
 * "/dashboard/:path*"  → Matches all dashboard routes
 * "/api/users/*"       → Matches all user API routes
 */
export const config = {
    /**
     * Protected route patterns.
     *
     * Current patterns:
     * - `/qrcode/:path*` - All QR code scanning and generation routes
    * - `/dashboard/:path*` - User dashboard pages
     *
     * Future patterns to consider:
     * - `/dashboard/:path*` - User dashboard
     * - `/admin/:path*` - Admin panel
     */
    matcher: [
        "/qrcode/:path*",
        "/dashboard/:path*",
    ],
};
