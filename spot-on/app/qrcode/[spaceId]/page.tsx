'use client'

import { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeDisplayPage() {

    const params = useParams();
    const rawSpaceId = params?.spaceId;
    const spaceId = Array.isArray(rawSpaceId) ? rawSpaceId[0] : rawSpaceId;
    const hasValidSpaceId = Boolean(spaceId);

    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!hasValidSpaceId) {
            return;
        }

        const currentSpaceId = spaceId;
        if (!currentSpaceId) {
            return;
        }

        const fetchQrCode = async () => {
            try {
                const response = await fetch(`/api/qrcode/display/${currentSpaceId}`);
                const data = await response.json();

                if (!response.ok) {
                    setError(data?.error || 'Failed to load QR code.');
                    setUrl(null);
                    return;
                }

                if (!data?.qrCodeURL) {
                    setError('QR code unavailable for this space.');
                    setUrl(null);
                    return;
                }

                setUrl(data.qrCodeURL);
                setError(null);
            }

            catch {
                setError('Failed to load QR code.');
                setUrl(null);
            }
        };

        const interval = setInterval(fetchQrCode, 5000);
        console.log(`Starting QR code polling for space ${currentSpaceId}`);
        fetchQrCode();
        return () => clearInterval(interval);
    }, [hasValidSpaceId, spaceId]);

    const displayError = hasValidSpaceId ? error : 'Invalid space identifier.';
    const isLoading = !url && !displayError;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Scan to Join Space</h1>
            {displayError ? (
                <p className="text-red-600">{displayError}</p>
            ) : null}
            {url ? <QRCodeSVG value={url} size={256} /> : null}
            {isLoading ? (
                <p className="text-gray-500">Loading QR code...</p>
            ) : null}
        </div>
    );
}
