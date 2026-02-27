import { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, Monitor } from 'lucide-react';
import ConnectionDiscovery from './ConnectionDiscovery';

const STATUS_CONFIG = {
    standalone: { icon: Monitor, color: '#64748b', label: 'Standalone', bg: '#64748b15' },
    syncing: { icon: RefreshCw, color: '#f59e0b', label: 'Syncing…', bg: '#f59e0b15' },
    synced: { icon: Wifi, color: '#10b981', label: 'Synced', bg: '#10b98115' },
    error: { icon: WifiOff, color: '#ef4444', label: 'Sync Error', bg: '#ef444415' },
};

export default function SyncStatus() {
    const [syncState, setSyncState] = useState({ status: 'standalone', peer: null, lastSync: null });
    const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

    useEffect(() => {
        if (!window.electron?.getSyncStatus) return;

        // Initial fetch
        window.electron.getSyncStatus().then(setSyncState);

        // Listen for real-time updates
        if (window.electron.onSyncStatusChanged) {
            window.electron.onSyncStatusChanged(setSyncState);
        }
    }, []);

    // Don't render outside Electron
    if (!window.electron?.getSyncStatus) return null;

    const config = STATUS_CONFIG[syncState.status] || STATUS_CONFIG.standalone;
    const Icon = config.icon;
    const isSpinning = syncState.status === 'syncing';

    return (
        <>
            <button
                onClick={() => setIsDiscoveryOpen(true)}
                title="View Network Devices"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: config.bg,
                    marginBottom: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: `${config.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        animation: isSpinning ? 'spin 1.5s linear infinite' : 'none',
                    }}
                >
                    <Icon size={14} style={{ color: config.color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: config.color,
                    }}>
                        {config.label}
                    </div>
                    {syncState.peer && (
                        <div style={{
                            fontSize: '0.65rem',
                            color: 'var(--color-text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {syncState.peer.name} • {syncState.peer.host}
                        </div>
                    )}
                </div>

                {/* Pulse indicator for connected state */}
                {syncState.status === 'synced' && (
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: config.color,
                        boxShadow: `0 0 6px ${config.color}80`,
                        animation: 'pulse 2s ease-in-out infinite',
                        flexShrink: 0,
                    }} />
                )}

                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }
                `}</style>
            </button>
            <ConnectionDiscovery
                isOpen={isDiscoveryOpen}
                onClose={() => setIsDiscoveryOpen(false)}
            />
        </>
    );
}
