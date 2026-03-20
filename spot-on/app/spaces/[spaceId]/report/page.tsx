
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ReportForm from "@/components/space/report/ReportForm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

type ReportPageProps = {
    params: Promise<{ spaceId?: string }> | { spaceId?: string };
    searchParams?: Promise<{ qrToken?: string }> | { qrToken?: string };
};

export default async function ReportPage({ params, searchParams,
}: Readonly<ReportPageProps>) {
    const resolvedParams = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/api/auth/signin?callbackUrl=/dashboard");
    }
    const spaceId = resolvedParams?.spaceId;
    if (!spaceId) {
        redirect("/dashboard");
    }
    const qrToken = resolvedSearchParams?.qrToken;
    if (!qrToken) {
        redirect("/dashboard");
    }
    return (
        <main className="min-h-screen bg-gray-950 p-8 text-white flex items-center justify-center">
            <div className="w-full max-w-xl">
                <ReportForm spaceId={spaceId} initialQrToken={qrToken} />
            </div>
        </main>
    );
}
