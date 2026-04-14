"use client"

import OccupyButton from "../button/OccupyButton";
import { SpaceMarker } from "./type";

type Props = {
    space: SpaceMarker | null;
};

export default function SpaceDetailPanel({ space }: Readonly<Props>) {
    if (!space) return null;

    return (
        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-4 text-white">
            <h2 className="text-lg font-semibold">{space.name}</h2>
            <p className={space.isOccupied ? "text-red-400" : "text-green-400"}>
                {space.isOccupied ? "Ocupado" : "Livre"}
            </p>
            <p className="text-sm text-gray-400">Capacidade: {space.capacity}</p>
            <p className="text-sm text-gray-400">{space.hasPowerOutlet ? '⚡ Tomada' : 'Sem tomada'}</p>
            {space.isOccupied && space.expectedEndTime && (
                <p className="text-sm text-gray-400">
                    Livre às: {new Date(space.expectedEndTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                </p>
            )}
            <div className="pt-4">
                <OccupyButton spaceId={space.id} isOccupied={space.isOccupied} />
            </div>
        </div>
    );
}
