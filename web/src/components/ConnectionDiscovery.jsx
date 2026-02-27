import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Monitor, X, Server, Wifi } from 'lucide-react';

export default function ConnectionDiscovery({ isOpen, onClose }) {
    const [peers, setPeers] = useState([]);
    const [clients, setClients] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [networkInfo, setNetworkInfo] = useState(null);

    useEffect(() => {
        if (!isOpen || !window.electron) return;

        // Fetch current peers and network info
        refreshPeers();
        window.electron.getNetworkInfo().then(setNetworkInfo);

        // Listen for live updates
        if (window.electron.onDiscoveredPeersUpdated) {
            window.electron.onDiscoveredPeersUpdated(setPeers);
        }
    }, [isOpen]);

    const refreshPeers = async () => {
        if (!window.electron) return;
        setIsRefreshing(true);
        try {
            const [currentPeers, currentClients] = await Promise.all([
                window.electron.getDiscoveredPeers(),
                window.electron.getConnectedClients?.() || []
            ]);
            setPeers(currentPeers);
            setClients(currentClients);
        } catch (err) {
            console.error('Failed to get network resources:', err);
        } finally {
            setTimeout(() => setIsRefreshing(false), 500); // Visual feedback
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--color-bg-primary)',
                padding: '0',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '480px',
                maxHeight: '80vh',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 36, height: 36,
                            borderRadius: '10px',
                            background: 'var(--color-bg-tertiary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--color-text-primary)'
                        }}>
                            <Wifi size={20} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
                                Network Devices
                            </h2>
                            {networkInfo && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>
                                    Scanning on {networkInfo.ip}
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={refreshPeers}
                            title="Refresh Discovery"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: isRefreshing ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                                padding: '8px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} style={{
                                animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                            }} />
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                padding: '8px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {/* Currently Connected Mobile Apps */}
                    {clients.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Actively Connected
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {clients.map((client, idx) => (
                                    <div key={`client-${client.ip}-${idx}`} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'var(--color-success)10',
                                        border: '1px solid var(--color-success)30',
                                        borderRadius: '12px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: 40, height: 40,
                                                borderRadius: '10px',
                                                background: 'var(--color-success)20',
                                                color: 'var(--color-success)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Wifi size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                    {client.device_name || 'Mobile App'}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{client.ip}</span>
                                                    <span style={{ fontSize: '10px', opacity: 0.5 }}>•</span>
                                                    <span style={{ color: 'var(--color-success)' }}>Active Now</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            background: 'var(--color-success)20',
                                            color: 'var(--color-success)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            Connected
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Discovered Peers */}
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '12px', marginTop: clients.length ? '8px' : '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Local Network
                    </h3>

                    {peers.length === 0 && clients.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '32px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            color: 'var(--color-text-muted)'
                        }}>
                            <div style={{
                                width: 64, height: 64,
                                borderRadius: '50%',
                                background: 'var(--color-bg-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Server size={32} style={{ opacity: 0.5 }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>No devices found</h3>
                                <p style={{ fontSize: '0.85rem', margin: 0, maxWidth: '280px', lineHeight: 1.5 }}>
                                    Make sure other Storage Management instances are running and connected to the same Wi-Fi network.
                                </p>
                            </div>
                        </div>
                    ) : peers.length === 0 && clients.length > 0 ? (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            No other desktop instances discovered.
                        </div>
                    ) : (
                        peers.map((peer, idx) => (
                            <div key={`${peer.host}:${peer.port}-${idx}`} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                            }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: 40, height: 40,
                                        borderRadius: '10px',
                                        background: 'var(--color-accent-primary)20',
                                        color: 'var(--color-accent-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Monitor size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                                            {peer.name || 'Unknown Device'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{peer.host}:{peer.port}</span>
                                            <span style={{ fontSize: '10px', opacity: 0.5 }}>•</span>
                                            <span style={{ color: 'var(--color-success)' }}>Available</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    background: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 500
                                }}>
                                    Discovered
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>,
        document.body
    );
}
