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