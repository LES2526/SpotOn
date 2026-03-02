'use client'

import DeskIcon, { DeskStatus } from "./DeskIcon";

interface StudyDeskProps {
    seats: 1 | 4;
    shape?: "circular" | "rectangular";
    size?: number;
    initialStatus?: DeskStatus;
    onToggle?: (next: DeskStatus) => void;
}

export default function StudyDesk({ seats, shape = "circular",
    size = 100, initialStatus = "available" }: Readonly<StudyDeskProps>) {
    return (
        <div className="flex items-center justify-center rounded-md p-4">
            <DeskIcon shape={shape} seats={seats} status={initialStatus} size={size} />
        </div>
    );
}
