import ButtonDefault from "@/components/button/ButtonDefault";

export default function DashboardHeader() {
    return (
        <div className="mb-8 flex justify-between gap-2">
            <ButtonDefault href="/leaderboard">🏆 Ranking</ButtonDefault>
            <ButtonDefault href="/profile">Ver perfil →</ButtonDefault>
        </div>
    );
}
