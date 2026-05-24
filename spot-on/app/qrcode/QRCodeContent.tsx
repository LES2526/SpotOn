'use client'

import ErrorStatus from "@/components/qrcode/Error";
import ExpiredStatus from "@/components/qrcode/Expired";
import LoadingStatus from "@/components/qrcode/Loading";
import OccupiedStatus from "@/components/qrcode/Occupied";
import SuccessStatus from "@/components/qrcode/Success";
import UserOccupiedStatus from "@/components/qrcode/UserOccupied";
import ExtendSession from "@/components/qrcode/ExtendSession";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AfterHoursStatus from "@/components/qrcode/AfterHoursStatus";

export default function QRCodeContent() {

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

                    if(response.status === 409){

                        if(errorData.error.match(/occupied/i)){
                            const spaceRes = await fetch(`/api/qrcode/display/${spaceId}`);
                            const spaceData = await spaceRes.json();
                            setReportToken(spaceData.currentQrToken ?? null);
                            setStatus('occupied');
                        }

                        if(errorData.error.match(/active session/i)){
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

    const [errorTitle, setErrorTitle] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    function setErrorFromResponse(status: number, backendError?: string) {
        const err = (backendError ?? '').toLowerCase();
        if (status === 409 && err.includes('full capacity')) {
            setErrorTitle('Sessão cheia');
            setJoinError('Esta sessão já está com lotação máxima. Tenta noutro espaço.');
        } else if (status === 409 && err.includes('already joined')) {
            setErrorTitle('Já fazes parte da sessão');
            setJoinError('Já és participante desta sessão de estudo.');
        } else if (status === 409 && err.includes('pending')) {
            setErrorTitle('Pedido pendente');
            setJoinError('Já tens um pedido de adesão por aprovar para esta sessão.');
        } else if (status === 429) {
            setErrorTitle('Demasiados pedidos');
            setJoinError('Recebeste várias rejeições recentemente. Tenta novamente mais tarde.');
        } else if (status === 401) {
            setErrorTitle('Sessão expirada');
            setJoinError('Precisas de iniciar sessão para te juntares a um espaço.');
        } else if (status === 404) {
            setErrorTitle('Espaço não encontrado');
            setJoinError('Não foi possível encontrar este espaço ou a sessão ativa.');
        } else {
            setErrorTitle(null);
            setJoinError(backendError ?? `Pedido falhou (HTTP ${status}).`);
        }
    }

    const joinSession = async () => {
        try {
            const response = await fetch(`/api/spaces/${spaceId}/sessions/join-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrWindow, sig }),
            });
            if (response.ok) {
                setIsJoin(true);
                setStatus('success');
            } else {
                const data = await response.json().catch(() => ({}));
                setErrorFromResponse(response.status, data.error);
                setStatus('error');
            }
        } catch {
            setErrorTitle('Sem ligação');
            setJoinError('Não foi possível contactar o servidor. Verifica a tua ligação.');
            setStatus('error');
        }
    };

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
            {status === 'error' && <ErrorStatus title={errorTitle} message={joinError} />}
            {status === 'after_hours' && <AfterHoursStatus />}
        </div>
    );
}