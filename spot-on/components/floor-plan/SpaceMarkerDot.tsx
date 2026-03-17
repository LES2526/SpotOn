import { SpaceMarker } from "./type";

type Props = {
    space: SpaceMarker;
    // Whether this marker is currently selected (shows white border)
    isSelected: boolean;
    // Callback fired when the user clicks the marker
    onClick: (space: SpaceMarker) => void;
};

// Renders a single space as a colored rectangle on the SVG floor plan.
// Green = available, Red = occupied. Coordinates are in SVG units (absolute, not %).
export default function SpaceMarkerDot({ space, isSelected, onClick }: Readonly<Props>) {
    // Red if occupied, green if available
    const fill = space.isOccupied ? "#ef4444" : "#22c55e";

    return (
        <rect
            x={space.posX}
            y={space.posY}
            width={space.width}
            height={space.height}
            transform={`rotate(${space.rotation}, ${space.posX + space.width/2}, ${space.posY + space.height/2})`}
            fill={fill}
            fillOpacity={0.6}   // semi-transparent so the floor plan is visible underneath
            stroke={isSelected ? "white" : "transparent"}
            strokeWidth={3}
            style={{ cursor: "pointer" }}
            onClick={() => onClick(space)}
        />
    );
}