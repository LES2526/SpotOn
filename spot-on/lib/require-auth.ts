import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession, type Session } from 'next-auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

/** Returns the authenticated session, or null if the user is not signed in.
 *
 *  When ENABLE_TEST_AUTH=true, accepts a `x-test-user-id` request header and
 *  resolves the user from the database instead of running the NextAuth flow.
 *  Used by Postman/Newman API tests; never enable in production.
 */
export async function requireAuth(): Promise<Session | null> {
    if (process.env.ENABLE_TEST_AUTH === 'true') {
        const testSession = await tryTestAuth();
        if (testSession) return testSession;
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    return session;
}

async function tryTestAuth(): Promise<Session | null> {
    try {
        const hdrs = await headers();
        const testUserId = hdrs.get('x-test-user-id');
        if (!testUserId) return null;
        const user = await prisma.user.findUnique({
            where: { id: testUserId },
            select: { id: true, email: true, image: true, studentId: true },
        });
        if (!user) return null;
        return {
            user: {
                id: user.id,
                email: user.email,
                image: user.image ?? undefined,
                studentId: user.studentId ?? undefined,
            },
            expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        } as unknown as Session;
    } catch {
        return null;
    }
}
