"use client";

import { isEmailFromDomain } from "@/lib/auth-utils";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function hasSpaces(email: string): boolean {
    return /\s/.test(email);
}

function isWrongDomain(email: string, domain: string): boolean {
    if (!email.includes("@")) return false;
    const [, emailDomain] = email.split("@");
    return !!emailDomain && !isEmailFromDomain(email, domain);
}

export default function SignInForm({ allowedDomain }: Readonly<{ allowedDomain: string }>) {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [spaceWarning, setSpaceWarning] = useState(false);
    const spaceWarningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        if (hasSpaces(value)) {
            setSpaceWarning(true);
            if (spaceWarningTimeoutRef.current) {
                clearTimeout(spaceWarningTimeoutRef.current);
            }
            spaceWarningTimeoutRef.current = setTimeout(() => {
                setSpaceWarning(false);
            }, 2000);
            setEmail(value.replace(/\s/g, ""));
        } else {
            setEmail(value);
        }
    }

    useEffect(() => {
        return () => {
            if (spaceWarningTimeoutRef.current) {
                clearTimeout(spaceWarningTimeoutRef.current);
            }
        };
    }, []);

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        if (!email || hasSpaces(email)) return;
        setLoading(true);
        setSubmitError(null);
        const result = await signIn("email", { email, callbackUrl, redirect: false });
        setLoading(false);
        if (result?.error) {
            setSubmitError("Não foi possível enviar o email. Tenta novamente.");
            return;
        }
        setSubmitted(true);
    }

    if (submitted) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-white mb-3">Email enviado!</h2>
                    <p className="text-gray-400">
                        Enviámos um link de acesso para <strong className="text-white">{email}</strong>.
                        Verifica a tua caixa de entrada.
                    </p>
                </div>
            </main>
        );
    }

    const blocked = !email || hasSpaces(email);
    const domainWarning = isWrongDomain(email, allowedDomain);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-1">Entrar no Spot-On</h2>
                <p className="text-gray-400 mb-6 text-sm">
                    Usa o teu email institucional <span className="text-gray-300">@{allowedDomain}</span>
                </p>
                <form onSubmit={handleSubmit} noValidate>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder={`utilizador@${allowedDomain}`}
                        autoComplete="email"
                        className={`w-full rounded-lg border px-4 py-2.5 bg-gray-800 text-white placeholder-gray-500 outline-none transition
                            ${domainWarning
                                ? "border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                                : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            }`}
                    />
                    {spaceWarning && (
                        <p className="mt-1.5 text-sm text-red-400">O email não pode conter espaços.</p>
                    )}
                    {!spaceWarning && domainWarning && (
                        <p className="mt-1.5 text-sm text-yellow-400">
                            Este email não é do domínio @{allowedDomain}. O acesso pode ser recusado.
                        </p>
                    )}
                    {submitError && (
                        <p className="mt-1.5 text-sm text-red-400">{submitError}</p>
                    )}
                    <button
                        type="submit"
                        disabled={blocked || loading}
                        className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? "A enviar..." : "Enviar link de acesso"}
                    </button>
                </form>
            </div>
        </main>
    );
}
