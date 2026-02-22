import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, X, Copy, Check } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

export default function ServerInfo() {
    const [info, setInfo] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (window.electron) {
            window.electron.getNetworkInfo().then(setInfo);
        }
    }, []);

    if (!info) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(info.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    marginTop: '4px'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                    e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                    e.currentTarget.style.borderRadius = '6px';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                <Smartphone size={16} />
                Connect Mobile
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
                                color: 'var(--color-text-muted)'
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
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Connect Mobile App</h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                Scan this QR code in the PSMS mobile app to connect to this server.
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
                                    display: 'flex', alignItems: 'center'
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
