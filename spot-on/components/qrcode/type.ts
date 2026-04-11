export type OccupiedStatusProps = {
    reportHref?: string;
    onJoinSession: () => void;
};

export type SuccessStatusProps = {
    spaceId: string;
    isJoin?: boolean;
};
