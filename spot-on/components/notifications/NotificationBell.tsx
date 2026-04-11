'use client';

import type { Notification } from '@/app/generated/prisma';
import React from "react";

export default function NotificationBell() {
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await fetch('/api/notifications', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data);
                } else {
                    setNotifications([]);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
                setNotifications([]);
            }
        };
        fetchNotifications();
    }, []);

    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('click', handler);
        return () => {
            document.removeEventListener('click', handler);
        };
    }, []);

    const handleNotificationDismiss = async (id: string) => {
        await fetch(`/api/notifications/${id}/resolve`, { method: 'PATCH' });
        setNotifications(prev => prev.filter(n => n.id !== id));
    };
    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-2 rounded-full hover:bg-gray-800 transition-colors"
                aria-label="Notificações"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {notifications.length}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-gray-900 border border-gray-700 shadow-lg z-50 overflow-hidden">
                    <p className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700">
                        Notificações
                    </p>
                    {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500 text-center">
                            Sem notificações.
                        </p>
                    ) : (
                        <ul>
                            {notifications.map(n => (
                                <li key={n.id}>
                                    <button
                                        onClick={() => handleNotificationDismiss(n.id)}
                                        className="w-full text-left px-4 py-4 hover:bg-gray-800 transition-colors flex items-start gap-3"
                                    >
                                        <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                                        <span className="text-sm text-gray-200">{n.message}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
