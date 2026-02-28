"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OccupyButton({ spaceId, isOccupied }: Readonly<{ spaceId: string, isOccupied: boolean }>) {
    const [occupied, setOccupied] = useState(isOccupied);
    const router = useRouter();
    async function handleClick() {
        const res = await fetch(`/api/spaces/${spaceId}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        if (res.ok) {
            setOccupied(!occupied);
            router.refresh(); // Refresh the page to get the latest data
        } else {
            const data = await res.json();
            alert(data.error ?? "Something went wrong");
        }
    }
    return (
        <button
            onClick={handleClick}
            className={`mt-2 w-full rounded px-4 py-2 text-white ${occupied ? 'bg-red-500' : 'bg-green-500'}`}
        >
            {occupied ? 'Free' : 'Occupy'}
        </button>
    );
}
