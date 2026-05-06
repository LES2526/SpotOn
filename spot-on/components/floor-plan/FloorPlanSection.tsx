"use client"

import FloorPlanView from "@/components/floor-plan/FloorPlanView";
import { FloorPlanData } from "@/components/floor-plan/type";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SpaceDetailPanel from "./SpaceDetailPanel";
import SpacePanel from "../dashboard/SpacePanel";

export default function FloorPlanSection({ floorPlan }: Readonly<{ floorPlan: FloorPlanData }>) {
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
    const [pointsToast, setPointsToast] = useState<number | null>(null);
    const router = useRouter();

    let selectedSpace = null;
    if (selectedSpaceId !== null) {
        let found = null;
        for (const space of floorPlan.spaces) {
            if (space.id === selectedSpaceId) {
                found = space;
                break;
            }
        }
        selectedSpace = found;
    }

    function handleCheckoutSuccess(points: number) {
        setPointsToast(points);
        router.refresh();
        setTimeout(() => setPointsToast(null), 2500);
    }

    if (floorPlan.spaces.length === 0) {
        return <p className="text-sm text-gray-500">Nenhum espaço encontrado neste piso.</p>
    }
    return (
        <div>
            {pointsToast !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl border border-green-700 bg-gray-900 px-10 py-8 text-center shadow-2xl">
                        <p className="text-lg font-semibold text-green-400">Sessão terminada!</p>
                        <p className="mt-1 text-3xl font-bold text-white">+{pointsToast}</p>
                        <p className="mt-1 text-sm text-gray-400">pontos atribuídos</p>
                    </div>
                </div>
            )}
            <SpacePanel spaces={floorPlan.spaces} />
            <div className="flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                    <FloorPlanView
                        floorPlan={floorPlan}
                        selectedSpace={selectedSpace}
                        onSelectSpace={(space) => setSelectedSpaceId(space.id)}
                    />
                </div>
                {selectedSpace && (
                    <div className="w-72 shrink-0">
                        <SpaceDetailPanel key={selectedSpaceId} space={selectedSpace} onCheckoutSuccess={handleCheckoutSuccess} />
                    </div>
                )}
            </div>
        </div>
    );
}
