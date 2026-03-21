'use client'

import { useEffect, useState } from 'react';

import axios from 'axios';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeDisplayPage() {

    const { spaceId } = useParams();

    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchQrCode = async () => {
            try {
                const { data } = await axios.get(`/api/qrcode/display/${spaceId}`);
                setUrl(data.qrCodeURL);
            }

            catch (error) {
                console.error('Error fetching QR code:', error);
            }
        };

        const interval = setInterval(fetchQrCode, 5000);
        console.log(`Starting QR code polling for space ${spaceId}`);
        fetchQrCode();
        return () => clearInterval(interval);
    }, [spaceId]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Scan to Join Space</h1>
            {url ? (
                <QRCodeSVG value={url} size={256} />
            ) : (
                <p className="text-gray-500">Loading QR code...</p>
            )}
        </div>
    );
}
