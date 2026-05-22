"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OccupyButton({
  spaceId,
  isOccupied,
  isFull,
}: Readonly<{ spaceId: string; isOccupied: boolean; isFull?: boolean }>) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const res = await fetch(`/api/spaces/${spaceId}/sessions`, {
      method: isOccupied ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? "Something went wrong");
    }
    setLoading(false);
    setShowConfirm(false);
  }

  if (isOccupied && showConfirm) {
    return (
      <div className="mt-2 rounded border border-red-900 bg-red-950/40 p-3 flex flex-col gap-2">
        <p className="text-sm text-red-300">
          Vais desfazer a sessão de estudo, tens a certeza?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleClick}
            disabled={loading}
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Confirmar"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="flex-1 rounded px-3 py-1.5 text-sm font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={isOccupied ? () => setShowConfirm(true) : handleClick}
      disabled={loading || (!isOccupied && !!isFull)}
      className={`mt-2 w-full rounded px-4 py-2 text-white font-medium transition-colors disabled:opacity-50 ${isOccupied ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
    >
      {isOccupied ? "Desfazer Sessão" : loading ? "..." : "Ocupar"}
    </button>
  );
}
