'use client'

import AfterHoursStatus from "@/components/qrcode/AfterHoursStatus";
import ErrorStatus from "@/components/qrcode/Error";
import ExpiredStatus from "@/components/qrcode/Expired";
import ExtendSession from "@/components/qrcode/ExtendSession";
import LoadingStatus from "@/components/qrcode/Loading";
import OccupiedStatus from "@/components/qrcode/Occupied";
import SuccessStatus from "@/components/qrcode/Success";
import UserOccupiedStatus from "@/components/qrcode/UserOccupied";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function OccupySpaceContent() {

    const [status, setStatus] = useState<
        'loading' | 'success' | 'occupied' | 'user_occupied' | 'expired' | 'error' | 'extend' | 'after_hours'
    >('loading');
    const [reportToken, setReportToken] = useState<string | null>(null);
    const [isJoin, setIsJoin] = useState(false);
    const [currentEndTime, setCurrentEndTime] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const spaceId = searchParams.get('spaceId');
    const qrWindow = searchParams.get('window');
    const sig = searchParams.get('sig');
    const isInvalidQr = !spaceId || !qrWindow || !sig;

    useEffect(() => {
        if (isInvalidQr) return;

        const occupySpace = async () => {
            try {
                const response = await fetch(`/api/qrcode/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ spaceId, qrWindow, sig }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.message?.match(/already active/i)) {
                        const sessionRes = await fetch(`/api/spaces/${spaceId}/sessions/current`);
                        const sessionData = await sessionRes.json();
                        setCurrentEndTime(sessionData.expectedEndTime);
                        setStatus('extend');
                    }
                    else {
                        setStatus('success');
                    }
                }
                else {
                    const errorData = await response.json();

                    if (response.status === 409) {

                        if (errorData.error.match(/occupied/i)) {
                            const spaceRes = await fetch(`/api/qrcode/display/${spaceId}`);
                            const spaceData = await spaceRes.json();
                            setReportToken(spaceData.currentQrToken ?? null);
                            setStatus('occupied');
                        }

                        if (errorData.error.match(/active session/i)) {
                            setStatus('user_occupied');
                            return;
                        }

                    }

                    else if (response.status === 400 && errorData.error === 'expired') {
                        setStatus('expired');
                    }

                    else if (response.status === 400 && errorData.error === 'after_hours') {
                        setStatus('after_hours');
                    }

                    else {
                        setStatus('error');
                    }

                }
            } catch (error) {
                console.error('Network error:', error);
                setStatus('error');
            }
        };
        occupySpace();
    }, [isInvalidQr, spaceId, qrWindow, sig]);

    const joinSession = async () => {
        try {
            const response = await fetch(`/api/spaces/${spaceId}/sessions/join-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                setIsJoin(true);
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    if (isInvalidQr) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <LoadingStatus />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            {status === 'loading' && <LoadingStatus />}
            {status === 'success' && <SuccessStatus spaceId={spaceId} isJoin={isJoin} />}
            {status === 'occupied' && (
                <OccupiedStatus
                    reportHref={reportToken ? `/spaces/${spaceId}/report?qrToken=${encodeURIComponent(reportToken)}` : undefined}
                    onJoinSession={joinSession}
                />
            )}
            {status === 'extend' && (
                <ExtendSession
                    spaceId={spaceId}
                    currentEndTime={currentEndTime!}
                    onAfterHours={() => setStatus('after_hours')}
                />
            )}
            {status === 'user_occupied' && <UserOccupiedStatus />}
            {status === 'expired' && <ExpiredStatus />}
            {status === 'error' && <ErrorStatus />}
            {status === 'after_hours' && <AfterHoursStatus />}
        </div>
    );
}

export default function OccupySpacePage() {
    return (
        <Suspense fallback={<LoadingStatus />}>
            <OccupySpaceContent />
        </Suspense>
    );
}
