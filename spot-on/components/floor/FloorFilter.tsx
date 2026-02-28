type FloorPlan = { name: string };

type FloorFilterProps = {
    floorPlans: FloorPlan[];
    selectedFloor: string | null;
};

function extractFloorNumber(name: string): string {
    const match = new RegExp(/\d+/).exec(name);
    return match ? match[0] : name;
}

export default function FloorFilter({ floorPlans, selectedFloor }: Readonly<FloorFilterProps>) {
    return (
        <div className="mb-8 flex justify-center gap-6">
            {floorPlans.map((fp) => (
                <a
                    key={fp.name}
                    href={`/dashboard?floor=${fp.name}`}
                    className={`flex flex-col items-center justify-center w-32 h-32 rounded-2xl border-2 transition-colors ${selectedFloor === fp.name
                        ? 'border-white bg-gray-700 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                >
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-500">Piso</span>
                    <span className="text-5xl font-bold">{extractFloorNumber(fp.name)}</span>
                </a>
            ))}
        </div>
    );
}
