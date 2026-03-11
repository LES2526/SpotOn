"use client";

import ReportForm from "@/components/space/ReportForm";
import { useParams } from "next/navigation";

export default function ReportPage() {
    const { spaceId } = useParams<{ spaceId: string }>();

    return (
        <main className="min-h-screen bg-gray-950 p-8 text-white flex items-center justify-center">
            <div className="w-full max-w-xl">
                <ReportForm spaceId={spaceId} />
            </div>
        </main>
    );
}
