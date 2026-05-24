'use client';

import ButtonDefault from '@/components/button/ButtonDefault';

type Props = {
    title?: string | null;
    message?: string | null;
};

export default function ErrorStatus({ title, message }: Readonly<Props>) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-800 bg-gray-900 p-10 shadow-xl max-w-sm w-full">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-950 border border-red-800">
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <div className="text-center">
                    <h1 className="text-xl font-semibold text-white mb-3">{title ?? 'Algo correu mal'}</h1>
                    <p className="text-base text-gray-200">{message ?? 'Ocorreu um erro inesperado. Por favor, tenta novamente.'}</p>
                </div>

                <ButtonDefault href="/dashboard">← Voltar ao Dashboard</ButtonDefault>
            </div>
        </div>
    );
}
