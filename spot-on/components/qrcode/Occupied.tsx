'use client';

import ButtonDefault from '@/components/button/ButtonDefault';
import Link from 'next/link';

type OccupiedStatusProps = {
    reportHref?: string;
    onJoinSession: () => void;
};

export default function OccupiedStatus({ reportHref, onJoinSession }: Readonly<OccupiedStatusProps>) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-800 bg-gray-900 p-10 shadow-xl max-w-sm w-full">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-950 border border-red-800">
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3C6.477 3 2 7.477 2 12s4.477 9 10 9 10-4.477 10-9S17.523 3 12 3z" />
                    </svg>
                </div>
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-white mb-2">Space Unavailable</h1>
                    <p className="text-sm text-gray-500">This space is already occupied by another user.</p>
                </div>
                <button
                    onClick={onJoinSession}
                    className="w-full rounded-lg bg-green-500 hover:bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors"
                >
                    Juntar-me à sessão
                </button>
                {reportHref && (
                    <Link
                        href={reportHref}
                        className="w-full rounded-lg border border-red-800 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950 transition-colors text-center"
                    >
                        Denunciar espaço
                    </Link>
                )}
                <ButtonDefault href="/dashboard">← Back to Dashboard</ButtonDefault>
            </div>
        </div>
    );
}
