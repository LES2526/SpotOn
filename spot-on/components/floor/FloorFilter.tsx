type FloorPlan = { floor: number };

type FloorFilterProps = {
    floorPlans: FloorPlan[];
    // Currently active floor; null means no floor is selected
    selectedFloor: number | null;
};

// Renders a row of clickable floor cards used to filter the dashboard by floor.
// Selecting a floor navigates to /dashboard?floor=<floor>.
export default function FloorFilter({ floorPlans, selectedFloor }: Readonly<FloorFilterProps>) {
    return (
        <div className="mb-8 flex justify-center gap-6">
            {floorPlans.map((fp) => (
                <a
                    key={fp.floor}
                    href={`/dashboard?floor=${fp.floor}`}
                    // Highlight the card that matches the currently selected floor
                    className={`flex flex-col items-center justify-center w-32 h-32 rounded-2xl border-2 transition-colors ${selectedFloor === fp.floor
                        ? 'border-white bg-gray-700 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                >
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-500">Piso</span>
                    <span className="text-5xl font-bold">{fp.floor}</span>
                </a>
            ))}
        </div>
    );
}
