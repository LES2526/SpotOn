"use client";

import { useState } from "react";
import { SpaceMarker } from "./type";

type Props = {
  space: SpaceMarker | null;
  onCheckoutSuccess: (points: number) => void;
};

export default function SpaceDetailPanel({ space, onCheckoutSuccess }: Readonly<Props>) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!space) return null;

  async function handleCheckout() {
    if (!space) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch(`/api/spaces/${space.id}/sessions/checkout`, {
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

  const typeLabel = space.type === "GROUP_ROOM" ? "Sala de grupo" : "Mesa individual";

  return (
    <div className="p-4 text-white">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{space.name}</h2>
        <span className="text-xs text-gray-400">{typeLabel}</span>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${space.isOccupied ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${space.isOccupied ? "bg-red-400" : "bg-green-400"}`} />
          {space.isOccupied ? "Ocupado" : "Livre"}
        </span>
        <span className="text-sm text-gray-400">
          {space.isOccupied
            ? `${space.currentOcuppants}/${space.capacity} pessoas`
            : `Capacidade: ${space.capacity}`}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {space.hasPowerOutlet && (
          <span className="rounded-md bg-gray-800 px-2.5 py-1 text-xs text-gray-300">⚡ Tomada</span>
        )}
        {space.hasComputer && (
          <span className="rounded-md bg-gray-800 px-2.5 py-1 text-xs text-gray-300">💻 Computador</span>
        )}
        {space.hasInteractiveBoard && (
          <span className="rounded-md bg-gray-800 px-2.5 py-1 text-xs text-gray-300">📋 Quadro interativo</span>
        )}
      </div>

      {space.isOccupied && space.expectedEndTime && (
        <p className="mb-4 text-sm text-gray-400">
          Livre às{" "}
          <span className="font-medium text-gray-200">
            {new Date(space.expectedEndTime).toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
      )}

      {space.isOccupied && space.participantsList.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Participantes</p>
          <ul className="flex flex-col gap-1.5">
            {space.participantsList.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 shrink-0">
                  {p.email[0].toUpperCase()}
                </span>
                <span className="truncate text-sm text-gray-300">{p.email}</span>
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

      {!space.isOccupied && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-center">
          <p className="text-sm text-gray-400">Lê o QR code da sala para iniciar uma sessão</p>
        </div>
      )}

      {space.currentUserIsInSession && (
        <div className="mt-4">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-orange-400 border border-orange-900 hover:bg-orange-950 transition-colors"
            >
              Sair da sessão
            </button>
          ) : (
            <div className="rounded-lg border border-orange-900 bg-orange-950/40 p-3 flex flex-col gap-2">
              <p className="text-sm text-orange-300">A sessão vai encerrar. Tens a certeza?</p>
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
            <p className="mt-2 text-xs text-red-400">{checkoutError}</p>
          )}
        </div>
      )}
    </div>
  );
}