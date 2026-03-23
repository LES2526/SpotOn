export type SpaceMarker = {
    id: string;
    name: string;
    capacity: number;
    type: string;
    hasPowerOutlet: boolean;
    description: string | null;
    shape: string | null;
    points: string;
    isOccupied: boolean;
    expectedEndTime: Date | null;
};

export type FloorPlanData = {
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    viewBox: string,
    svgContent: string;
    spaces: SpaceMarker[];
};