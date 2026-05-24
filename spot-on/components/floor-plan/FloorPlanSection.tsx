"use client"

import FloorPlanView from "@/components/floor-plan/FloorPlanView";
import { FloorPlanData } from "@/components/floor-plan/type";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SpaceDetailPanel from "./SpaceDetailPanel";
import SessionExpiryModal from "./SessionExpiryModal";

type UserSession = {
    spaceId: string;
    expectedEndTime: Date;
    isHost: boolean;
};

export default function FloorPlanSection({ floorPlan, userSession }: Readonly<{ floorPlan: FloorPlanData; userSession: UserSession | null }>) {
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
        setSelectedSpaceId(null);
        router.refresh();
        setTimeout(() => setPointsToast(null), 2500);
    }

    return (
        <div>
            {floorPlan.spaces.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">Nenhum espaço encontrado para os filtros selecionados.</p>
            )}
            {userSession && (
                <SessionExpiryModal
                    spaceId={userSession.spaceId}
                    expectedEndTime={userSession.expectedEndTime}
                    isHost={userSession.isHost}
                />
            )}
            {pointsToast !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl border border-green-700 bg-gray-900 px-10 py-8 text-center shadow-2xl">
                        <p className="text-lg font-semibold text-green-400">Sessão terminada!</p>
                        <p className="mt-1 text-3xl font-bold text-white">+{pointsToast}</p>
                        <p className="mt-1 text-sm text-gray-400">pontos atribuídos</p>
                    </div>
                </div>
            )}
            <FloorPlanView
                floorPlan={floorPlan}
                selectedSpace={selectedSpace}
                onSelectSpace={(space) => setSelectedSpaceId(space.id)}
            />
            {selectedSpace && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 flex items-end md:items-center justify-center"
                    onClick={() => setSelectedSpaceId(null)}
                >
                    <div
                        className="relative w-full md:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-gray-900"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedSpaceId(null)}
                            className="absolute top-5 right-5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            aria-label="Fechar"
                        >✕</button>
                        <SpaceDetailPanel key={selectedSpaceId} space={selectedSpace} onCheckoutSuccess={handleCheckoutSuccess} />
                    </div>
                </div>
            )}
        </div>
    );
}
