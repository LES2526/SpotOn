"use client";

import { LeaderboardEntry } from "@/app/api/leaderboard/route";
import ButtonDefault from "@/components/button/ButtonDefault";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";

const TOP3_STYLES = [
    {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/40",
        text: "text-yellow-400",
        badge: "🥇",
    },
    {
        bg: "bg-gray-400/10",
        border: "border-gray-400/30",
        text: "text-gray-300",
        badge: "🥈",
    },
    {
        bg: "bg-amber-700/10",
        border: "border-amber-700/40",
        text: "text-amber-500",
        badge: "🥉",
    },
];

export default function LeaderboardPage() {
    const { data: session } = useSession();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/leaderboard")
            .then((res) => {
                if (!res.ok) throw new Error("Erro ao carregar o ranking...");
                return res.json();
            })
            .then((data: LeaderboardEntry[]) => setLeaderboard(data))
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen bg-[#0f0f0f] px-4 py-10 text-white">
            <section className="mx-auto max-w-2xl">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">🏆 Ranking</h1>
                    <ButtonDefault href="/dashboard">← Dashboard</ButtonDefault>
                </div>

                {loading && (
                    <p className="text-center text-sm text-gray-500">A carregar...</p>
                )}

                {error && <p className="text-center text-sm text-red-400">{error}</p>}

                {!loading && !error && leaderboard.length === 0 && (
                    <p className="text-center text-sm text-gray-500">
                        Nenhum utilizador encontrado.
                    </p>
                )}

                {!loading && !error && leaderboard.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {leaderboard.map((entry) => {
                            const isCurrentUser = entry.id === session?.user?.id;
                            const topStyle = TOP3_STYLES[entry.rank - 1] ?? null;
                            const displayName = entry.email.split("@")[0];

                            const rowBase =
                                "flex items-center gap-4 rounded-xl border px-4 py-3 transition-all";
                            const rowColor = isCurrentUser
                                ? "border-violet-500/50 bg-violet-500/10"
                                : topStyle
                                    ? `${topStyle.bg} ${topStyle.border}`
                                    : "border-gray-800 bg-gray-900/50";

                            return (
                                <div key={entry.id} className={`${rowBase} ${rowColor}`}>
                                    {/* Rank */}
                                    <div className="w-8 flex-shrink-0 text-center">
                                        {topStyle ? (
                                            <span className="text-xl">{topStyle.badge}</span>
                                        ) : (
                                            <span className="text-sm font-semibold text-gray-500">
                                                #{entry.rank}
                                            </span>
                                        )}
                                    </div>

                                    {/* Avatar */}
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-700">
                                        <Image
                                            src={entry.image ?? "/avatar1.svg"}
                                            alt={displayName}
                                            width={40}
                                            height={40}
                                            className="h-10 w-10 object-cover"
                                        />
                                    </div>

                                    {/* Nome e email */}
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate font-medium ${isCurrentUser ? "text-violet-300" : "text-gray-100"}`}
                                        >
                                            {displayName}
                                            {isCurrentUser && (
                                                <span className="ml-2 text-xs text-violet-400">
                                                    (eu)
                                                </span>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">
                                            {entry.email}
                                        </p>
                                    </div>

                                    {/* Pontos */}
                                    <div className="text-right">
                                        <span
                                            className={`text-lg font-bold ${topStyle ? topStyle.text : isCurrentUser ? "text-violet-300" : "text-gray-100"}`}
                                        >
                                            {entry.points}
                                        </span>
                                        <p className="text-xs text-gray-500">pts</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
