'use client'

import { useState } from "react";

interface StudyDeskProps {
    seats: number;
}

export default function StudyDesk({seats}: StudyDeskProps) {

    const [occupied, setOccupied] = useState(false);

    const handleClick = () => setOccupied((v) => !v);

    return (
    <div
      role="button"
      onClick={handleClick}
      aria-pressed={occupied}
      className={`flex items-center justify-center p-6 items-center justify-center cursor-pointer rounded-md p-4 transition-colors ${
        occupied ? "bg-red-100" : "bg-white"
      }`}
    >
      <h1 className="text-2xl font-bold">
        {occupied ? "Occupied" : `Study Desk with ${seats} seats`}
      </h1>
    </div>
  );
}