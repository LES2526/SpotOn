"use client";
import React from 'react';

type ReportFormProps = {
    spaceId: string;
    initialQrToken: string;
};

export default function ReportForm(
    { spaceId, initialQrToken }: Readonly<ReportFormProps>) {
    const [reason, setReason] = React.useState('');
    const qrToken = initialQrToken;
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        if (!spaceId || !qrToken) {
            setError('QR inválido. Faz novo scan do código e tenta novamente.');
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/spaces/${spaceId}/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason, qrToken })
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error);
                return;
            }
            setSuccess(true);
        } catch {
            setError('Unexpected error. Please try again.');
        }
        setLoading(false);
    };
    return (
        <div>
            <h1>
                Denunciar Espaço
            </h1>
            <textarea
                placeholder="Motivo da denúncia"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded mb-4"
            />
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded">
                {loading ? 'A enviar...' : 'Enviar Denúncia'}
            </button>
            {error &&
                <p className="text-red-500 mt-2">
                    {error}
                </p>}
            {success &&
                <p className="text-green-500 mt-2">
                    Denúncia enviada com sucesso!
                </p>}
        </div>);
}
