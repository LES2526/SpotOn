'use client';

import ButtonDefault from '@/components/button/ButtonDefault';

export default function ExpiredStatus() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-800 bg-gray-900 p-10 shadow-xl max-w-sm w-full">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-800 border border-gray-700">
                    <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <div className="text-center">
                    <h1 className="text-xl font-semibold text-white mb-2">QR Code Expired</h1>
                    <p className="text-sm text-gray-500">The QR code you scanned has expired. Please scan the display tablet again for a fresh code.</p>
                </div>

                <ButtonDefault href="/dashboard">← Back to Dashboard</ButtonDefault>
            </div>
        </div>
    );
}