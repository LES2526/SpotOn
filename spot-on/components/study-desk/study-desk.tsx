'use client'

import { useState, JSX } from "react";
import DeskIcon, { DeskStatus } from "./deskIcon";

interface StudyDeskProps {
  seats: 1 | 4;
  shape?: "circular" | "rectangular";
  size?: number;
  initialStatus?: DeskStatus;
  onToggle?: (next: DeskStatus) => void;
}

export default function StudyDesk({
  seats,
  shape = "circular",
  size = 100,
  initialStatus = "available",
  onToggle,
}: StudyDeskProps): JSX.Element {const [status, setStatus] = useState<DeskStatus>(initialStatus);
/**
 * Toggles the status of the Desk between "occupied" and "available".
 * Calls the onToggle callback with the new status, if provided.
 */
  const handleClick = () => {
    const next: DeskStatus = status === "occupied" ? "available" : "occupied";
    setStatus(next);
    onToggle?.(next);
  };

  return (
  <div className="flex items-center justify-center rounded-md p-4">
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={status === "occupied"}
      aria-label={status === "occupied" ? "Occupied desk" : "Available desk"}
      className="p-0 bg-transparent border-0 cursor-pointer focus:outline-none"
    >
      <DeskIcon shape={shape} seats={seats} status={status} size={size} />
    </button>
  </div>
);
}