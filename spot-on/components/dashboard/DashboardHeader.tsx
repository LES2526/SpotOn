import ButtonDefault from "@/components/button/ButtonDefault";

export default function DashboardHeader() {
    return (
        <div className="mb-8 flex justify-end">
            <ButtonDefault href="/profile">Ver perfil →</ButtonDefault>
        </div>
    );
}
