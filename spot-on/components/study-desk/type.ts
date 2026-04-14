import { DeskShape, DeskStatus } from "./DeskIcon";

export type DeskIconProps = {
    shape: DeskShape;
    seats: 1 | 4;
    status: DeskStatus;
    size?: number;
}

export type StudyDeskProps = {
    seats: 1 | 4;
    shape?: "circular" | "rectangular";
    size?: number;
    initialStatus?: DeskStatus;
    onToggle?: (next: DeskStatus) => void;
}
