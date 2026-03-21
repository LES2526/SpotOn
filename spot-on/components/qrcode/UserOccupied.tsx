'use client';

import ButtonDefault from '@/components/button/ButtonDefault';

export default function UserOccupiedStatus() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-800 bg-gray-900 p-10 shadow-xl max-w-sm w-full">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-950 border border-yellow-800">
                    <svg className="w-7 h-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3C6.477 3 2 7.477 2 12s4.477 9 10 9 10-4.477 10-9S17.523 3 12 3z" />
                    </svg>
                </div>

                <div className="text-center">
                    <h1 className="text-xl font-semibold text-white mb-2">Active Session Detected</h1>
                    <p className="text-sm text-gray-500">You already have an active session. Please end it before joining a new space.</p>
                </div>

                <ButtonDefault href="/dashboard">← Go to Dashboard</ButtonDefault>
            </div>
        </div>
    );
}