'use client'

import ErrorStatus from "@/components/qrcode/Error";
import ExpiredStatus from "@/components/qrcode/Expired";
import LoadingStatus from "@/components/qrcode/Loading";
import OccupiedStatus from "@/components/qrcode/Occupied";
import SuccessStatus from "@/components/qrcode/Success";
import UserOccupiedStatus from "@/components/qrcode/UserOccupied";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function OccupySpacePage() {

    const [status, setStatus] = useState<
        'loading' | 'success' | 'occupied' | 'user_occupied' | 'expired' | 'error'>('loading');

    const searchParams = useSearchParams();
    const spaceId = searchParams.get('spaceId');
    const qrWindow = searchParams.get('window');
    const sig = searchParams.get('sig');
    const isInvalidQr = !spaceId || !qrWindow || !sig;

    useEffect(() => {
        if (isInvalidQr) {
            return;
        }

        const occupySpace = async () => {
            try {
                const response = await fetch('/api/qrcode/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ spaceId, qrWindow, sig }),
                });

                if (response.ok) {
                    setStatus('success');
                } else {
                    const errorData = await response.json();
                    if (response.status === 409 && errorData.error.match(/occupied/i)) {
                        setStatus('occupied');
                    } else if (response.status === 409 && errorData.error.match(/active session/i)) {
                        setStatus('user_occupied');
                    } else if (response.status === 400 && errorData.error === 'expired') {
                        setStatus('expired');
                    } else {
                        setStatus('error');
                    }
                }
            } catch (error) {
                console.error('Network error:', error);
            }
        };

        occupySpace();
    }, [isInvalidQr, spaceId, qrWindow, sig]);

    if (isInvalidQr) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <h1 className="text-2xl font-bold mb-4">Invalid QR Code</h1>
                <p className="text-gray-500">The QR code you scanned is invalid. Contact the library&apos;s administrator for assistance.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            {status === 'loading' && (
                <LoadingStatus />
            )}
            {status === 'success' && (
                <SuccessStatus spaceId={spaceId} />
            )}
            {status === 'occupied' && (
                <OccupiedStatus />
            )}
            {status === 'user_occupied' && (
                <UserOccupiedStatus />
            )}
            {status === 'expired' && (
                <ExpiredStatus />
            )}
            {status === 'error' && (
                <ErrorStatus />
            )}
        </div>
    );
















}
