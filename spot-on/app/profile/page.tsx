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
    select: {
      name: true,
      email: true,
      image: true,
      studentId: true,   // campo do schema Prisma
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <ProfileCard
        name={user.name ?? ""}           // ?? "" porque name é String? no schema
        email={user.email}
        points={0}                        // ainda não há campo points na DB
        studentNumber={user.studentId ?? undefined}  // studentId é String? no schema
        image={user.image ?? undefined}
      />
    </main>
  );
}
