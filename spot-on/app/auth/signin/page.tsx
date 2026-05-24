import SignInForm from "@/components/auth/SignInForm";
import { Suspense } from "react";

function SignInLoading() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-lg animate-pulse">
                <div className="h-8 bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-700 rounded mb-6 w-3/4"></div>
                <div className="h-10 bg-gray-700 rounded mb-4"></div>
                <div className="h-12 bg-gray-700 rounded"></div>
            </div>
        </main>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<SignInLoading />}>
            <SignInForm allowedDomain={process.env.ALLOWED_EMAIL_DOMAIN} />
        </Suspense>
    );
}
