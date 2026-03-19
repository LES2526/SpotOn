import { SpaceMarker } from "./type";
import { SpaceType } from "@/app/generated/prisma";

type Props = {
    space: SpaceMarker;
    isSelected: boolean;
    onClick: (space: SpaceMarker) => void;
};

export default function SpaceMarkerDot({ space, isSelected, onClick }: Readonly<Props>) {
   // console.log(space.name, space.shape);
    if(space.shape === "CIRCULAR_DESK"){
        return <ellipse
                    cx={space.posX + space.width/2}
                    cy={space.posY + space.height/2}
                    rx={space.width/2}
                    ry={space.height/2}
                    fill={space.isOccupied ? "red" : "green"}
                    stroke={isSelected ? (space.isOccupied ? "red" : "green" ) : "transparent"}
                    strokeWidth={isSelected ? 5 : 3}
                    style={{ cursor: "pointer", filter: space.isOccupied ? "drop-shadow(0 0 6px red)" : "drop-shadow(0 0 6px green)" }}
                    onClick={() => onClick(space)}
                />
    }
        return (
            <rect
                x={space.posX}
                y={space.posY}
                width={space.width}
                height={space.height}
                transform={`rotate(${space.rotation}, ${space.posX + space.width/2}, ${space.posY + space.height/2})`}
                fill={space.type === SpaceType.INDIVIDUAL_DESK ? (space.isOccupied ? "red" : "green") : "transparent"}
                fillOpacity={0.6}
                stroke={space.type === SpaceType.GROUP_ROOM ? (space.isOccupied ? "red" : "green") : isSelected ? (space.isOccupied ? "red" : "green" ) : "transparent"}
                strokeWidth={isSelected ? 6 : 3}
                style={{ cursor: "pointer", filter: space.isOccupied ? "drop-shadow(0 0 6px red)" : "drop-shadow(0 0 6px green)" }}
                onClick={() => onClick(space)}
            />
        );
}
