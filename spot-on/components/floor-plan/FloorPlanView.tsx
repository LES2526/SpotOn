"use client";

import { useRef } from "react";
import { FloorPlanData, SpaceMarker } from "./type";
import SpaceMarkerDot from "./SpaceMarkerDot";

type Props = {
    floorPlan: FloorPlanData;
    selectedSpace: SpaceMarker | null;
    onSelectSpace: (space: SpaceMarker) => void;
};

function toSvgCoords(svgEl: SVGSVGElement, clientX: number, clientY: number) {
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
}


export default function FloorPlanView({ floorPlan, selectedSpace, onSelectSpace }: Readonly<Props>) {
    const svgRef = useRef<SVGSVGElement>(null);

    function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
        if (!svgRef.current) return;
        const coords = toSvgCoords(svgRef.current, e.clientX, e.clientY);
        console.log(`x: ${Math.round(coords.x)}, y: ${Math.round(coords.y)}`);
    }
    return (
    <div className="w-full overflow-auto rounded-lg border border-gray-700 bg-white">
        <svg ref={svgRef} viewBox={floorPlan.viewBox} fill = "none" className="w-full" onClick={handleSvgClick}>
            <g dangerouslySetInnerHTML={{ __html: floorPlan.svgContent}} />
            {floorPlan.spaces.map(space => (
                <SpaceMarkerDot
                    key={space.id}
                    space={space}
                    isSelected={selectedSpace?.id === space.id}
                    onClick={onSelectSpace}
                />
            ))}
        </svg>  
    </div>

    );
}
