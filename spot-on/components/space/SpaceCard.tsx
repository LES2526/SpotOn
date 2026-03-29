import StudyDesk from "@/components/study-desk/StudyDesk";

type SpaceCardProps = {
    id: string;
    name: string;
    capacity: number;
    hasPowerOutlet: boolean;
    type: string;
    description?: string | null;
    isOccupied: boolean;
};

export default function SpaceCard({ id, name, capacity, hasPowerOutlet, type, description, isOccupied }: Readonly<SpaceCardProps>) {
    return (
        <article className="flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold leading-tight">{name}</h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${isOccupied ? 'bg-red-950 text-red-400' : 'bg-green-950 text-green-400'}`}>
                    {isOccupied ? 'Ocupado' : 'Livre'}
                </span>
            </div>

            <div className="flex justify-center">
                <StudyDesk
                    seats={capacity > 1 ? 4 : 1}
                    shape={type === 'GROUP_ROOM' ? 'rectangular' : 'circular'}
                    initialStatus={isOccupied ? 'occupied' : 'available'}
                />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
                    {capacity} {capacity === 1 ? 'lugar' : 'lugares'}
                </span>
                <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
                    {hasPowerOutlet ? '⚡ Tomada' : 'Sem tomada'}
                </span>
            </div>

            {description && (
                <p className="mt-3 text-xs text-gray-500">{description}</p>
            )}
        </article>
    );
}
