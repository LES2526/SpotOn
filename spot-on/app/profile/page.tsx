"use client";

import ProfileCard from "@/components/profile/ProfileCard";

// Mock user data - replace with your real data fetching logic (e.g. session, API, etc.)
const mockUser = {
  name: "Ana Silva",
  email: "ana.silva@email.com",
  points: 0,
  studentNumber: "2021123456",
  image: undefined, // substitui por URL real ou session?.user?.image
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <ProfileCard
        name={mockUser.name}
        email={mockUser.email}
        points={mockUser.points}
        studentNumber={mockUser.studentNumber}
        image={mockUser.image}
      />
    </main>
  );
}
