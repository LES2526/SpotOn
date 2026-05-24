import ButtonDefault from "@/components/button/ButtonDefault";
import NotificationBell from "../notifications/NotificationBell";

export default function DashboardHeader({ leftSlot }: Readonly<{ leftSlot?: React.ReactNode }>) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                {leftSlot}
                <ButtonDefault href="/leaderboard">🏆 Ranking</ButtonDefault>
            </div>
            <div className="flex gap-1 items-center">
                <ButtonDefault href="/profile">Ver perfil →</ButtonDefault>
                <NotificationBell />
            </div>
        </div>
    );
}
