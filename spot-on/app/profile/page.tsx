// SEM "use client" — passa a ser Server Component (pode usar async/await)
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ProfileCard from "@/components/profile/ProfileCard";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true},
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
        <ProfileCard
            name={user!.name ?? user!.email.split("@")[0]}
            email={user!.email}
            points={0}
            image={user!.image ?? undefined}
        />
    </main>
  );
}
