import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

/** Returns the authenticated session, or null if the user is not signed in. */
export async function requireAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    return session;
}
