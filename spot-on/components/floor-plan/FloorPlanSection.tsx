"use client"

import { useState } from "react"
import { FloorPlanData, SpaceMarker } from "@/components/floor-plan/type";
import FloorPlanView from "@/components/floor-plan/FloorPlanView";
import SpaceDetailPanel from "./SpaceDetailPanel";
import FloorFilter from "../floor/FloorFilter";

export default function FloorPlanSection( { floorPlan }: Readonly<{ floorPlan: FloorPlanData }>){
    const [selectedSpace, setSelectedSpace] = useState<SpaceMarker | null> (null);


    /*
    function onFilterChange(filters: FloorFilterProps) {
        setFilters(filters);
    }
        */

    if(floorPlan.spaces.length === 0){
        return <p className="text-sm text-gray-500">Nenhum espaço encontrado neste piso.</p>
    }
    return (
        <div>
            <FloorPlanView
                floorPlan={floorPlan}
                selectedSpace={selectedSpace}
                onSelectSpace={setSelectedSpace}
            />
            <SpaceDetailPanel space={selectedSpace}/>
        </div>
    );
}