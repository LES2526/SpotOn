"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  spaceId: string;
  expectedEndTime: Date;
  isHost: boolean;
};

const WARNING_THRESHOLD_MS = 10 * 60 * 1000;
const MIN_EXTEND_MINUTES = 15;
const MAX_EXTEND_MINUTES = 120;

export default function SessionExpiryModal({
  spaceId,
  expectedEndTime,
  isHost,
}: Readonly<Props>) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    function check() {
      const remaining = new Date(expectedEndTime).getTime() - Date.now();
      if (remaining > 0 && remaining <= WARNING_THRESHOLD_MS && !dismissed) {
        setVisible(true);
      }
    }
    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, [expectedEndTime, dismissed]);

  if (!visible || !isHost) return null;

  async function handleExtend() {
    setLoading(true);
    setError(null);
    try {
      const newEndTime = new Date(
        new Date(expectedEndTime).getTime() + extendMinutes * 60 * 1000,
      );
      const res = await fetch(`/api/spaces/${spaceId}/sessions/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedEndTime: newEndTime.toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao estender a sessão.");
        return;
      }
      setVisible(false);
      router.refresh();
    } catch {
      setError("Erro inesperado. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-2xl border border-yellow-700 bg-gray-900 px-8 py-6 text-white shadow-2xl w-80 flex flex-col gap-4">
        <div>
          <p className="text-base font-semibold text-yellow-400">
            Sessão a terminar em breve
          </p>
          <p className="text-sm text-gray-400 mt-1">
            A tua sessão termina às{" "}
            {new Date(expectedEndTime).toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Estender por</span>
            <span className="font-medium text-white">{extendMinutes} min</span>
          </div>
          <input
            type="range"
            min={MIN_EXTEND_MINUTES}
            max={MAX_EXTEND_MINUTES}
            step={15}
            value={extendMinutes}
            onChange={(e) => setExtendMinutes(Number(e.target.value))}
            className="w-full accent-yellow-400"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>{MIN_EXTEND_MINUTES} min</span>
            <span>{MAX_EXTEND_MINUTES} min</span>
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleExtend}
            disabled={loading}
            className="flex-1 rounded px-3 py-2 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white transition-colors disabled:opacity-50"
          >
            {loading ? "A estender..." : "Estender"}
          </button>
          <button
            onClick={() => {
              setVisible(false);
              setDismissed(true);
            }}
            disabled={loading}
            className="flex-1 rounded px-3 py-2 text-sm font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Deixar terminar
          </button>
        </div>
      </div>
    </div>
  );
}
