import { NotificationType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';

/** Creates an in-app notification for a user. */
export async function createNotification(userId: string,
    type: NotificationType, message: string,
): Promise<void> {
    await prisma.notification.create({
        data: { userId, type, message }
    });
}

/** Marks a single notification as RESOLVED. */
export async function resolveNotificationById(id: string): Promise<void> {
    await prisma.notification.update({
        where: { id },
        data: { status: 'RESOLVED' },
    });
}

/** Marks all PENDING notifications of a given type for a user as RESOLVED. */
export async function resolveNotifications(
    userId: string,
    type: NotificationType,
): Promise<void> {
    await prisma.notification.updateMany({
        where: { userId, type, status: 'PENDING' },
        data: { status: 'RESOLVED' },
    });
}
