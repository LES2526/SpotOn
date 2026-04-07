"use client"

import FloorPlanView from "@/components/floor-plan/FloorPlanView";
import { FloorPlanData, SpaceMarker } from "@/components/floor-plan/type";
import { useState } from "react";
import SpaceDetailPanel from "./SpaceDetailPanel";
import SpacePanel from "../dashboard/SpacePanel";

export default function FloorPlanSection({ floorPlan }: Readonly<{ floorPlan: FloorPlanData }>) {
    const [selectedSpace, setSelectedSpace] = useState<SpaceMarker | null>(null);

    if (floorPlan.spaces.length === 0) {
        return <p className="text-sm text-gray-500">Nenhum espaço encontrado neste piso.</p>
    }
    return (
        <div>
            <SpacePanel spaces={floorPlan.spaces} />
            <FloorPlanView
                floorPlan={floorPlan}
                selectedSpace={selectedSpace}
                onSelectSpace={setSelectedSpace}
            />
            <SpaceDetailPanel space={selectedSpace} />
        </div>
    );
}
