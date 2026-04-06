import { SpaceType } from "@/app/generated/prisma";
import { SpaceMarker } from "./type";

type Props = {
    space: SpaceMarker;
    isSelected: boolean;
    onClick: (space: SpaceMarker) => void;
};

function parsePoints(points: string) {
    return points.trim().split(' ').map(pair => {
        const [x, y] = pair.split(',').map(Number);
        return { x, y };
    });
}

export default function SpaceMarkerDot({ space, isSelected, onClick }: Readonly<Props>) {
    const color = space.isOccupied ? "red" : "green";
    const glowStyle = { cursor: "pointer", filter: `drop-shadow(0 0 6px ${color})` };

    if (space.shape === "CIRCULAR_DESK") {
        const pts = parsePoints(space.points);
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const rx = (Math.max(...xs) - Math.min(...xs)) / 2;
        const ry = (Math.max(...ys) - Math.min(...ys)) / 2;
        return (
            <ellipse
                cx={cx} cy={cy} rx={rx} ry={ry}
                fill={color}
                stroke={isSelected ? color : "transparent"}
                strokeWidth={isSelected ? 5 : 3}
                style={glowStyle}
                onClick={() => onClick(space)}
            />
        );
    }

    return (
        <polygon
            points={space.points}
            fill={space.type === SpaceType.INDIVIDUAL_DESK ? color : "transparent"}
            fillOpacity={0.6}
            stroke={space.type === SpaceType.GROUP_ROOM ? color : isSelected ? color : "transparent"}
            strokeWidth={isSelected ? 6 : 3}
            style={glowStyle}
            onClick={() => onClick(space)}
        />
    );
}
