import ButtonDefault from "@/components/button/ButtonDefault";
import NotificationBell from "../notifications/NotificationBell";

export default function DashboardHeader() {
    return (
        <div className="mb-8 flex justify-between gap-2">
            <ButtonDefault href="/leaderboard">🏆 Ranking</ButtonDefault>
            <div className="flex gap-1">
                <ButtonDefault href="/profile">Ver perfil →</ButtonDefault>
                <NotificationBell />
            </div>
        </div>


    );
}
