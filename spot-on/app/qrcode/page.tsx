'use client'

import axios from "axios";
import { SessionProvider, useSession } from "next-auth/react"
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";
import SuccessStatus from "./Success";
import OccupiedStatus from "./Occupied";
import UserOccupiedStatus from "./UserOccupied";
import ExpiredStatus from "./Expired";
import ErrorStatus from "./Error";
import LoadingStatus from "./Loading";

export default function OccupySpacePage() {

    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            window.location.href = `/api/auth/signin?callbackUrl=/qrcode`;
        },
    });

    const [status, setStatus] = useState<
'loading' | 'success' | 'occupied' | 'user_occupied' | 'expired' | 'error'>('loading');

    const searchParams = useSearchParams();
    const spaceId = searchParams.get('spaceId');
    const qrWindow = searchParams.get('window');
    const sig = searchParams.get('sig');

    if (!spaceId || !qrWindow || !sig) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <h1 className="text-2xl font-bold mb-4">Invalid QR Code</h1>
                <p className="text-gray-500">The QR code you scanned is invalid. Contact the library's administrator for assistance.</p>
            </div>
        );
    }

    useEffect(() => {
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
    }, [spaceId, qrWindow, sig]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            {status === 'loading' && (
                <LoadingStatus />
            )}
            {status === 'success' && (
                <>
                    <SuccessStatus spaceId={spaceId} />
                </>
            )}
            {status === 'occupied' && (
                <>
                    <OccupiedStatus />
                </>
            )}            
            {status === 'user_occupied' && (
                <>
                    <UserOccupiedStatus />
                </>
            )}
            {status === 'expired' && (
                <>
                    <ExpiredStatus />
                </>
            )}
            {status === 'error' && (
                <>
                    <ErrorStatus />
                </>
            )}
        </div>
    );

    



    










}
