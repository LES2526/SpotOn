'use client';

export default function LoadingStatus() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-800 bg-gray-900 p-10 shadow-xl max-w-sm w-full">
                <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-green-400 animate-spin" />
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-white mb-2">Joining Space...</h1>
                    <p className="text-sm text-gray-500">Please wait while we verify the QR code.</p>
                </div>
            </div>
        </div>
    );
}