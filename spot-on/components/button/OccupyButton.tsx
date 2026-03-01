"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OccupyButton({ spaceId, isOccupied }: Readonly<{ spaceId: string, isOccupied: boolean }>) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    let buttonLabel = 'Ocupar';
    if (loading) buttonLabel = '...';
    else if (isOccupied) buttonLabel = 'Libertar';

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
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={`mt-2 w-full rounded px-4 py-2 text-white font-medium transition-colors disabled:opacity-50 ${isOccupied ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
            {buttonLabel}
        </button>
    );
}
