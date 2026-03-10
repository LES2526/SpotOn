// SEM "use client" — passa a ser Server Component (pode usar async/await)
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ButtonDefault from "@/components/button/ButtonDefault";
import ProfileCard from "@/components/profile/ProfileCard";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/api/auth/signin?callbackUrl=/dashboard");
    }
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, image: true },
    });

    if (!user) {
        redirect("/api/auth/signin?callbackUrl=/dashboard");
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f0f] px-4 gap-6">
            <ProfileCard
                email={user.email}
                points={0}
                image={user.image ?? undefined}
            />
            <ButtonDefault href="/dashboard">
                ← Voltar ao Dashboard
            </ButtonDefault>
        </main>
    );
}
