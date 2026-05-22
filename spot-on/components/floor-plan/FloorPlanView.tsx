"use client";

import { useRef } from "react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import SpaceMarkerDot from "./SpaceMarkerDot";
import { FloorPlanData, SpaceMarker } from "./type";

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

function ZoomControls() {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    const btnClass = "flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900/80 text-white hover:bg-gray-800 border border-gray-600 transition-colors";
    return (
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
            <button onClick={() => zoomIn()} className={btnClass} aria-label="Zoom in">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            </button>
            <button onClick={() => resetTransform()} className={btnClass} aria-label="Reset zoom">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
            </button>
            <button onClick={() => zoomOut()} className={btnClass} aria-label="Zoom out">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
            </button>
        </div>
    );
}

export default function FloorPlanView({ floorPlan, selectedSpace, onSelectSpace }: Readonly<Props>) {
    const svgRef = useRef<SVGSVGElement>(null);

    function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
        if (!svgRef.current) return;
        const coords = toSvgCoords(svgRef.current, e.clientX, e.clientY);
        console.log(`x: ${Math.round(coords.x)}, y: ${Math.round(coords.y)}`);
    }
    return (
        <div className="relative w-full overflow-hidden rounded-lg border border-gray-700" style={{ backgroundColor: "#EFE1C8" }}>
            <TransformWrapper>
                <ZoomControls />
                <TransformComponent wrapperStyle={{ width: "100%" }} contentStyle={{ width: "100%" }}>
                    <svg ref={svgRef} viewBox={floorPlan.viewBox} fill="none" className="w-full" onClick={handleSvgClick}>
                        <g dangerouslySetInnerHTML={{ __html: floorPlan.svgContent }} />
                        {floorPlan.spaces.map(space => (
                            <SpaceMarkerDot
                                key={space.id}
                                space={space}
                                isSelected={selectedSpace?.id === space.id}
                                onClick={onSelectSpace}
                            />
                        ))}
                    </svg>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
}
