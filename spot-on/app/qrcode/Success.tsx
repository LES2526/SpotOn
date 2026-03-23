'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SuccessStatusProps {
    spaceId: string;
}

const MIN_DURATION = 15;
const MAX_DURATION = 120;
const STEP = 15;
const DEFAULT_DURATION = 60;

function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}min`;
}

export default function SuccessStatus({ spaceId }: Readonly<SuccessStatusProps>) {
    const [durationMinutes, setDurationMinutes] = useState<number>(DEFAULT_DURATION);
    const router = useRouter();

    const handleConfirmDuration = async () => {
        try {
            const expectedEndTime = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
            await axios.patch(`/api/spaces/${spaceId}/sessions`, { expectedEndTime });
            router.push('/dashboard');
        } catch (error) {
            console.error('Error updating session:', error);
        }
    };

    // Percentage for the slider fill
    const fillPercent = ((durationMinutes - MIN_DURATION) / (MAX_DURATION - MIN_DURATION)) * 100;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-800 bg-gray-900 p-10 shadow-xl max-w-sm w-full">

                {/* Icon */}
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-950 border border-green-800">
                    <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                {/* Heading */}
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-white mb-2">Space Occupied!</h1>
                    <p className="text-sm text-gray-500">How long do you plan to stay?</p>
                </div>

                {/* Duration display */}
                <div className="flex items-center justify-center w-full py-2">
                    <span className="text-3xl font-bold text-green-400">
                        {formatDuration(durationMinutes)}
                    </span>
                </div>

                {/* Slider */}
                <div className="w-full px-1">
                    <style>{`
                        .duration-slider {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 100%;
                            height: 6px;
                            border-radius: 9999px;
                            outline: none;
                            cursor: pointer;
                            background: linear-gradient(
                                to right,
                                #22c55e 0%,
                                #22c55e ${fillPercent}%,
                                #374151 ${fillPercent}%,
                                #374151 100%
                            );
                        }
                        .duration-slider::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 22px;
                            height: 22px;
                            border-radius: 50%;
                            background: #22c55e;
                            border: 2px solid #16a34a;
                            cursor: pointer;
                            box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
                        }
                        .duration-slider::-moz-range-thumb {
                            width: 22px;
                            height: 22px;
                            border-radius: 50%;
                            background: #22c55e;
                            border: 2px solid #16a34a;
                            cursor: pointer;
                            box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
                        }
                    `}</style>
                    <input
                        type="range"
                        min={MIN_DURATION}
                        max={MAX_DURATION}
                        step={STEP}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="duration-slider"
                    />
                    {/* Min / Max labels */}
                    <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-600">{formatDuration(MIN_DURATION)}</span>
                        <span className="text-xs text-gray-600">{formatDuration(MAX_DURATION)}</span>
                    </div>
                </div>

                {/* Confirm button */}
                <button
                    onClick={handleConfirmDuration}
                    className="w-full rounded-lg bg-green-500 hover:bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors"
                >
                    Confirm — {formatDuration(durationMinutes)}
                </button>
            </div>
        </div>
    );
}