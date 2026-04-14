import type { Notification } from '@/app/generated/prisma';

export type JoinRequestPayload = {
    text: string;
    requesterId: string;
    requesterEmail: string;
    spaceId: string;
}

export type NotificationItemProps = {
    notification: Notification;
    loading: string | null;
    onDismiss: (id: string) => void;
    onJoinResponse: (id: string, spaceId: string, requesterId: string,
        action: 'approved' | 'rejected') => void;
}
