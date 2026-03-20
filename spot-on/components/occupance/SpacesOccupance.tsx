
type OccupanceCardProps = {
    totalDesks: number,
    occupiedDesks: number,
    totalRooms: number,
    occupiedRooms: number
}
export default function OccupanceCard(props : Readonly<OccupanceCardProps>) {
    const freeDesks = props.totalDesks - props.occupiedDesks;
    const freeRooms = props.totalRooms - props.occupiedRooms;
    const totalMesas = props.totalDesks + props.totalRooms;
    const totalOcupados = props.occupiedDesks + props.occupiedRooms;
    const occupanceRate = totalMesas > 0 ? (totalOcupados / totalMesas) * 100 : 0;
return (
    <div>
    <h2 className="text-lg font-semibold text-white mb-4">Legenda da Ocupação</h2>
    <div className="text-sm text-gray-400 mt-6">
        <span>Total de Mesas: {props.totalDesks} (Disponíveis: {freeDesks}) </span><br />
        <span>Total de Salas: {props.totalRooms} (Disponíveis: {freeRooms})</span><br />
        <span>Taxa de Ocupação: {occupanceRate.toFixed(1)}%</span>
    </div>
    <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-400">Disponível</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-sm text-gray-400">Ocupado</span>
        </div>
            <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-sm text-gray-400">Manutenção</span>
        </div>
    </div>
    </div>

)

}