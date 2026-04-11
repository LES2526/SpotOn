import { NotificationType } from '@/app/generated/prisma';
import { prisma } from '@/lib/prisma';

export async function createNotification(userId: string,
    type: NotificationType, message: string,
): Promise<void> {
    await prisma.notification.create({
        data: { userId, type, message }
    });
}

export async function resolveNotificationById(id: string): Promise<void> {
    await prisma.notification.update({
        where: { id },
        data: { status: 'RESOLVED' },
    });
}
