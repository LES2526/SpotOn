export type Notification = {
    id: string;
    spaceId: string;
    type: 'PROOF_OF_PRESENCE' | 'JOIN_REQUEST';
    message: string;
    href?: string;
    userId?: string;
    sessionId?: string;
};
