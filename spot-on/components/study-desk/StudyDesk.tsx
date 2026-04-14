'use client'

import DeskIcon from "./DeskIcon";
import { StudyDeskProps } from "./type";


export default function StudyDesk({ seats, shape = "circular",
    size = 100, initialStatus = "available" }: Readonly<StudyDeskProps>) {
    return (
        <div className="flex items-center justify-center rounded-md p-4">
            <DeskIcon shape={shape} seats={seats} status={initialStatus} size={size} />
        </div>
    );
}
