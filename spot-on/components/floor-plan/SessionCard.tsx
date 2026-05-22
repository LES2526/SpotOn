"use client";

import { useState } from "react";
import OccupyButton from "../button/OccupyButton";
import { SpaceMarker } from "./type";

type Props = {
  spaceId: string;
  currentUserIsInSession: boolean;
  currentUserIsHost: boolean;
  participantsList: SpaceMarker["participantsList"];
  currentOcuppants: number;
  capacity: number;
  onCheckoutSuccess: (points: number) => void;
};

export default function SessionCard({
  spaceId,
  currentUserIsInSession,
  currentUserIsHost,
  participantsList,
  currentOcuppants,
  capacity,
  onCheckoutSuccess,
}: Readonly<Props>) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/sessions/checkout`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setCheckoutError(data.error ?? "Erro ao sair da sessão.");
        return;
      }
      const data = await res.json();
      onCheckoutSuccess(data.pointsAwarded ?? 0);
    } catch {
      setCheckoutError("Erro inesperado. Tenta novamente.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t border-gray-700 pt-3 flex flex-col gap-2">
      {currentUserIsInSession && participantsList.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">
            Participantes
          </p>
          <ul className="flex flex-col gap-1">
            {participantsList.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="truncate text-gray-200">{p.email}</span>
                {p.isHost && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-yellow-900 text-yellow-300">
                    Host
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-2 pt-1">
        {currentUserIsHost && (
          <OccupyButton
            spaceId={spaceId}
            isOccupied={true}
            isFull={currentOcuppants >= capacity}
          />
        )}
        {currentUserIsInSession && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full rounded px-4 py-2 text-sm font-medium text-orange-400 border border-orange-900 hover:bg-orange-950 transition-colors"
          >
            Sair da sessão
          </button>
        )}
        {currentUserIsInSession && showConfirm && (
          <div className="rounded border border-orange-900 bg-orange-950/40 p-3 flex flex-col gap-2">
            <p className="text-sm text-orange-300">
              A Sessão vai encerrar. Tens a certeza?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors disabled:opacity-50"
              >
                {checkoutLoading ? "A sair..." : "Confirmar"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={checkoutLoading}
                className="flex-1 rounded px-3 py-1.5 text-sm font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {checkoutError && (
          <p className="text-xs text-red-400">{checkoutError}</p>
        )}
      </div>
    </div>
  );
}
