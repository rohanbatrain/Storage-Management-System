import { useState, useEffect } from 'react';
import { AlertTriangle, ServerOff, X } from 'lucide-react';

export default function GlobalErrorBanner() {
    const [show, setShow] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const handleNetworkError = (e) => {
            setErrorMsg(e.detail || 'Failed to load data. Is the backend running?');
            setShow(true);

            // Auto hide after 10 seconds
            setTimeout(() => {
                setShow(false);
            }, 10000);
        };

        window.addEventListener('network-error', handleNetworkError);
        return () => window.removeEventListener('network-error', handleNetworkError);
    }, []);

    if (!show) return null;

    return (
        <div style={{
            background: 'var(--color-danger)',
            color: 'white',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            zIndex: 9999,
            position: 'sticky',
            top: 0,
            animation: 'slideDown 0.3s ease-out'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ServerOff size={20} />
                <div style={{ fontWeight: 500 }}>
                    {errorMsg}
                </div>
            </div>
            <button
                onClick={() => setShow(false)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.8,
                    transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
            >
                <X size={18} />
            </button>
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
