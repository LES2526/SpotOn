import { NotificationType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';

export async function createNotification(userId: string,
    type: NotificationType, message: string,
): Promise<void> {
    await prisma.notification.create({
        data: { userId, type, message }
    });
}

export async function resolveNotifications(
    userId: string,
    type: NotificationType,
): Promise<void> {
    await prisma.notification.updateMany({
        where: { userId, type, status: 'PENDING' },
        data: { status: 'RESOLVED' },
    });
}

export async function resolveNotificationsByMessage(
    userId: string,
    type: NotificationType,
    message: string,
): Promise<void> {
    await prisma.notification.updateMany({
        where: {
            userId, type, status: 'PENDING',
            message: { contains: message }
        },
        data: { status: 'RESOLVED' },
    });
}
