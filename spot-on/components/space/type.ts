export type SpaceCardProps = {
    id: string;
    name: string;
    capacity: number;
    hasPowerOutlet: boolean;
    type: string;
    description?: string | null;
    isOccupied: boolean;
};
