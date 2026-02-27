import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, X, Copy, Check } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

export default function ServerInfo() {
    const [info, setInfo] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [connectedCount, setConnectedCount] = useState(0);

    useEffect(() => {
        if (!window.electron) return;

        window.electron.getNetworkInfo().then(setInfo);

        const fetchClients = async () => {
            try {
                if (window.electron.getConnectedClients) {
                    const clients = await window.electron.getConnectedClients();
                    setConnectedCount(clients.length || 0);
                }
            } catch (error) {
                console.error("Failed to fetch connected clients in sidebar", error);
            }
        };

        // Fetch immediately and then poll every 5 seconds
        fetchClients();
        const intervalId = setInterval(fetchClients, 5000);

        return () => clearInterval(intervalId);
    }, []);

    // Auto-close QR code modal when a client successfully connects
    useEffect(() => {
        if (connectedCount > 0 && isOpen) {
            setIsOpen(false);
        }
    }, [connectedCount, isOpen]);

    const handleRefresh = async () => {
        if (window.electron) {
            setIsRefreshing(true);
            const newInfo = await window.electron.getNetworkInfo();
            setInfo(newInfo);
            setTimeout(() => setIsRefreshing(false), 500); // Small delay to show animation
        }
    };

    if (!info) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(info.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasClients = connectedCount > 0;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    width: '100%',
                    border: 'none',
                    background: hasClients ? 'var(--color-success)15' : 'transparent',
                    color: hasClients ? 'var(--color-success)' : 'var(--color-text-muted)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    marginTop: '4px',
                    borderRadius: hasClients ? '6px' : '0px'
                }}
                onMouseEnter={e => {
                    if (!hasClients) {
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                        e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                        e.currentTarget.style.borderRadius = '6px';
                    } else {
                        e.currentTarget.style.background = 'var(--color-success)25';
                    }
                }}
                onMouseLeave={e => {
                    if (!hasClients) {
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                        e.currentTarget.style.background = 'transparent';
                    } else {
                        e.currentTarget.style.background = 'var(--color-success)15';
                    }
                }}
            >
                <Smartphone size={16} />
                {hasClients
                    ? `${connectedCount} Mobile${connectedCount > 1 ? 's' : ''}`
                    : 'Connect Mobile'}
            </button>

            {isOpen && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999, // Ensure it's on top of everything
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setIsOpen(false)}>
                    <div style={{
                        background: 'var(--color-bg-primary)',
                        padding: '24px',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '400px',
                        position: 'relative',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid var(--color-border)'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 16, right: 16,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                padding: '4px'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                background: '#fff',
                                padding: '16px',
                                borderRadius: '12px',
                                display: 'inline-block',
                                margin: '0 auto 16px'
                            }}>
                                <QRCode value={info.url} size={200} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Connect Mobile App</h3>
                                <button
                                    onClick={handleRefresh}
                                    title="Refresh IP Address"
                                    style={{
                                        background: 'var(--color-bg-tertiary)',
                                        border: '1px solid var(--color-border)',
                                        cursor: 'pointer',
                                        color: isRefreshing ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s',
                                        transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                </button>
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                Scan this QR code in the SMS mobile app to connect to this server.
                            </p>
                        </div>

                        <div style={{
                            background: 'var(--color-bg-secondary)',
                            padding: '12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid var(--color-border)',
                            marginBottom: '24px'
                        }}>
                            <code style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{info.url}</code>
                            <button
                                onClick={copyToClipboard}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
                                    display: 'flex', alignItems: 'center',
                                    padding: '4px'
                                }}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                            Ensure your mobile device is connected to the same Wi-Fi network: <strong>{info.ip}</strong>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
