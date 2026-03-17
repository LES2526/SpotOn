export type SpaceMarker = {
    id: string;
    name: string;
    capacity: number;
    type: string;
    hasPowerOutlet: boolean;
    description: string | null;
    posX: number;
    posY: number;
    width: number;
    height: number;
    rotation: number;
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