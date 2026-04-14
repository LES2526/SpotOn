'use client'

import { JSX } from "react";
import { DeskIconProps } from "./type";

export type DeskShape = "circular" | "rectangular";
export type DeskStatus = "available" | "occupied";

const COLORS = {
    available: { desk: "#22c55e", seat: "#16a34a", stroke: "#15803d" },
    occupied: { desk: "#ef4444", seat: "#dc2626", stroke: "#b91c1c" },
};

function CircularDesk1Seat({ c, size }: Readonly<{ c: typeof COLORS.available; size: number }>): JSX.Element {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            {/* Desk */}
            <circle cx="50" cy="50" r="22" fill={c.desk} stroke={c.stroke} strokeWidth="2" />
            {/* Seat - top */}
            <circle cx="50" cy="18" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
        </svg>
    );
}

function CircularDesk4Seats({ c, size }: Readonly<{ c: typeof COLORS.available; size: number }>): JSX.Element {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            {/* Desk */}
            <circle cx="50" cy="50" r="22" fill={c.desk} stroke={c.stroke} strokeWidth="2" />
            {/* Seats - top, right, bottom, left */}
            <circle cx="50" cy="18" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
            <circle cx="82" cy="50" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
            <circle cx="50" cy="82" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
            <circle cx="18" cy="50" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
        </svg>
    );
}

function RectangularDesk1Seat({ c, size }: Readonly<{ c: typeof COLORS.available; size: number }>): JSX.Element {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            {/* Desk */}
            <rect x="30" y="38" width="40" height="28" rx="4" fill={c.desk} stroke={c.stroke} strokeWidth="2" />
            {/* Seat - top center */}
            <circle cx="50" cy="26" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
        </svg>
    );
}

function RectangularDesk4Seats({ c, size }: Readonly<{ c: typeof COLORS.available; size: number }>): JSX.Element {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            {/* Desk */}
            <rect x="25" y="35" width="50" height="30" rx="4" fill={c.desk} stroke={c.stroke} strokeWidth="2" />
            {/* Top seats */}
            <circle cx="38" cy="22" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
            <circle cx="62" cy="22" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
            {/* Bottom seats */}
            <circle cx="38" cy="78" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
            <circle cx="62" cy="78" r="8" fill={c.seat} stroke={c.stroke} strokeWidth="1.5" />
        </svg>
    );
}

function DeskIcon({ shape, seats, status, size = 100 }: Readonly<DeskIconProps>): JSX.Element {
    const colors = COLORS[status];

    if (shape === "circular" && seats === 1) return <CircularDesk1Seat c={colors} size={size} />;
    if (shape === "circular" && seats === 4) return <CircularDesk4Seats c={colors} size={size} />;
    if (shape === "rectangular" && seats === 1) return <RectangularDesk1Seat c={colors} size={size} />;
    return <RectangularDesk4Seats c={colors} size={size} />;
}

export default DeskIcon;
