export type SpaceMarker = {
    id: string;
    name: string;
    capacity: number;
    type: string;
    hasPowerOutlet: boolean;
    hasComputer : boolean;
    hasInteractiveBoard : boolean;
    description: string | null;
    shape: string | null;
    points: string;
    isOccupied: boolean;
    expectedEndTime: Date | null;
    currentUserIsInSession: boolean;
    currentOcuppants: number;
    participantsList: {id:string; name:string | null; email: string; isHost: boolean}[];
};

export type FloorPlanData = {
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    viewBox: string;
    svgContent: string;
    spaces: SpaceMarker[];
};