'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SpaceMarker } from '../floor-plan/type';

interface SpacePanelProps {
    spaces: SpaceMarker[];
}

const FEATURE_FILTERS = [
    { label: 'Power Outlet', param: 'hasPowerOutlet', icon: '⚡' },
    { label: 'Computer', param: 'hasComputer', icon: '💻' },
    { label: 'Interactive Board', param: 'hasInteractiveBoard', icon: '📋' },
];

const TYPE_FILTERS = [
    { label: 'Individual', value: 'INDIVIDUAL_DESK' },
    { label: 'Group Room', value: 'GROUP_ROOM' },
];

const OCCUPANCY_FILTERS = [
    { label: 'Free', value: 'false' },
    { label: 'Occupied', value: 'true' },
];

export default function SpacePanel({ spaces }: Readonly<SpacePanelProps>) {
    const [isOpen, setIsOpen] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();

    const updateParam = useCallback((key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === null) {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        router.push(`/dashboard?${params.toString()}`);
    }, [router, searchParams]);

    const clearAll = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        ['type', 'hasPowerOutlet', 'hasComputer', 'hasInteractiveBoard', 'isOccupied'].forEach(k => params.delete(k));
        router.push(`/dashboard?${params.toString()}`);
    }, [router, searchParams]);

    const hasActiveFilters = ['type', 'hasPowerOutlet', 'hasComputer', 'hasInteractiveBoard', 'isOccupied']
        .some(key => searchParams.has(key));

    return (
        <div className="absolute top-4 left-4 z-20 flex flex-col items-start">

            {/* Hamburger toggle button — always visible above the panel */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex flex-col items-center justify-center gap-1 w-8 h-8 mb-2 rounded-lg bg-gray-800/95 backdrop-blur-sm border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                aria-label={isOpen ? 'Close panel' : 'Open panel'}
            >
                <span className="w-4 h-0.5 bg-current rounded-full" />
                <span className="w-4 h-0.5 bg-current rounded-full" />
                <span className="w-4 h-0.5 bg-current rounded-full" />
            </button>

            {/* Panel */}
            <div className={`
                flex flex-col
                w-64 max-h-[calc(100vh-8rem)]
                bg-gray-900/95 backdrop-blur-sm
                border border-gray-700 rounded-xl shadow-2xl
                overflow-hidden
                transition-all duration-300 ease-in-out
                ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none h-0 border-0'}
            `}>
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <span className="text-sm font-semibold text-white">Study Spaces</span>
                    {hasActiveFilters && (
                        <button
                            onClick={clearAll}
                            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 flex flex-col">
                    {/* Filters section */}
                    <div className="px-4 py-3 border-b border-gray-800 flex flex-col gap-4">

                        {/* Type */}
                        <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">Type</p>
                            <div className="flex flex-col gap-1.5">
                                {TYPE_FILTERS.map(({ label, value }) => {
                                    const isChecked = searchParams.get('type') === value;
                                    return (
                                        <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => updateParam('type', isChecked ? null : value)}
                                                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-green-500 cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                                                {label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Features */}
                        <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">Features</p>
                            <div className="flex flex-col gap-1.5">
                                {FEATURE_FILTERS.map(({ label, param, icon }) => {
                                    const isChecked = searchParams.get(param) === 'true';
                                    return (
                                        <label key={param} className="flex items-center gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => updateParam(param, isChecked ? null : 'true')}
                                                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-green-500 cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                                                {icon} {label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Availability */}
                        <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">Availability</p>
                            <div className="flex flex-col gap-1.5">
                                {OCCUPANCY_FILTERS.map(({ label, value }) => {
                                    const isChecked = searchParams.get('isOccupied') === value;
                                    return (
                                        <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => updateParam('isOccupied', isChecked ? null : value)}
                                                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-green-500 cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                                                {label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Space list */}
                    <div className="flex flex-col py-1">
                        {spaces.length === 0 ? (
                            <p className="px-4 py-6 text-xs text-gray-600 text-center">
                                No spaces match the selected filters.
                            </p>
                        ) : (
                            spaces.map((space) => (
                                <div
                                    key={space.id}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/60 transition-colors"
                                >
                                    {/* Status dot */}
                                    <span className={`
                                        w-2 h-2 rounded-full shrink-0
                                        ${space.isOccupied ? 'bg-red-500' : 'bg-green-500'}
                                    `} />

                                    {/* Name */}
                                    <span className="text-xs text-gray-300 flex-1 truncate">
                                        {space.name}
                                    </span>

                                    {/* Feature icons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {space.hasPowerOutlet && <span className="text-[10px]">⚡</span>}
                                        {space.hasComputer && <span className="text-[10px]">💻</span>}
                                        {space.hasInteractiveBoard && <span className="text-[10px]">📋</span>}
                                    </div>

                                    {/* Capacity */}
                                    <span className="text-[10px] text-gray-600 shrink-0">
                                        {space.capacity}p
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}