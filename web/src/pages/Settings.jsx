import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Printer, Settings as SettingsIcon, Database, RefreshCw } from 'lucide-react';
import { exportApi } from '../services/api';

function Settings() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const loadSummary = async () => {
        try {
            const res = await exportApi.exportSummary();
            setSummary(res.data);
        } catch (error) {
            console.error('Failed to load summary:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();
    }, []);

    const handleExport = async () => {
        try {
            setExporting(true);
            const res = await exportApi.exportFull();
            const exportData = JSON.stringify(res.data, null, 2);

            // Download as file
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `storage-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export:', error);
            alert('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <RefreshCw size={32} className="spinning" style={{ color: 'var(--color-text-muted)' }} />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">⚙️ Settings</h1>
            </div>

            {/* Data Summary */}
            {summary && (
                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📊 Your Data
                    </h2>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                    {summary.locations_count}
                                </div>
                                <div style={{ color: 'var(--color-text-muted)' }}>📍 Locations</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                    {summary.items_count}
                                </div>
                                <div style={{ color: 'var(--color-text-muted)' }}>📦 Items</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                    {summary.outfits_count}
                                </div>
                                <div style={{ color: 'var(--color-text-muted)' }}>👔 Outfits</div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Backup & Export */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    💾 Backup & Export
                </h2>
                <div className="card">
                    <button
                        className="settings-item"
                        onClick={handleExport}
                        disabled={exporting}
                        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>📤</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {exporting ? 'Exporting...' : 'Export All Data'}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    Download a JSON backup of everything
                                </div>
                            </div>
                            <Download size={20} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                    </button>
                    <div style={{ borderTop: '1px solid var(--color-border)' }} />
                    <button
                        className="settings-item"
                        onClick={() => navigate('/qr-print')}
                        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>🖨️</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    Print QR Codes
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    Generate printable PDF with QR codes
                                </div>
                            </div>
                            <Printer size={20} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                    </button>
                </div>
            </section>

            {/* About */}
            <section>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ℹ️ About
                </h2>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Version</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>1.0.0</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>App</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>Personal Storage Manager</span>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Settings;
