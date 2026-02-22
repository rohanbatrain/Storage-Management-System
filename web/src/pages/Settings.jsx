import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Printer, Archive, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { exportApi } from '../services/api';

function Settings() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportingArchive, setExportingArchive] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

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

    const handleExportArchive = async () => {
        try {
            setExportingArchive(true);
            const res = await exportApi.exportArchive();

            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sms-archive-${new Date().toISOString().split('T')[0]}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export archive:', error);
            alert('Failed to export archive');
        } finally {
            setExportingArchive(false);
        }
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset file input so same file can be re-selected
        e.target.value = '';

        if (!file.name.endsWith('.zip')) {
            alert('Please select a .zip archive file exported from SMS.');
            return;
        }

        const confirmed = window.confirm(
            '⚠️ WARNING: Importing will REPLACE all existing data (locations, items, outfits, history, and uploaded images).\n\n' +
            'This action cannot be undone.\n\n' +
            'Are you sure you want to proceed?'
        );

        if (!confirmed) return;

        try {
            setImporting(true);
            setImportResult(null);
            const res = await exportApi.importArchive(file);
            setImportResult({
                success: true,
                data: res.data.restored,
            });
            // Refresh summary
            loadSummary();
        } catch (error) {
            console.error('Failed to import:', error);
            setImportResult({
                success: false,
                error: error.response?.data?.detail || error.message || 'Import failed',
            });
        } finally {
            setImporting(false);
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1.5rem' }}>
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
                            {summary.uploads_count > 0 && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                        {summary.uploads_count}
                                    </div>
                                    <div style={{ color: 'var(--color-text-muted)' }}>🖼️ Images ({summary.uploads_size_mb} MB)</div>
                                </div>
                            )}
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
                    {/* Export Archive (primary) */}
                    <button
                        onClick={handleExportArchive}
                        disabled={exportingArchive}
                        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>📦</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {exportingArchive ? 'Exporting Archive...' : 'Export Full Archive'}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    Download a .zip with all data + images — for device migration
                                </div>
                            </div>
                            {exportingArchive ? (
                                <RefreshCw size={20} className="spinning" style={{ color: 'var(--color-text-muted)' }} />
                            ) : (
                                <Archive size={20} style={{ color: 'var(--color-text-muted)' }} />
                            )}
                        </div>
                    </button>

                    <div style={{ borderTop: '1px solid var(--color-border)' }} />

                    {/* Export JSON */}
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>📤</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {exporting ? 'Exporting...' : 'Export Data (JSON)'}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    Lightweight backup — database only, no images
                                </div>
                            </div>
                            <Download size={20} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                    </button>

                    <div style={{ borderTop: '1px solid var(--color-border)' }} />

                    {/* Print QR Codes */}
                    <button
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

            {/* Import / Restore */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📥 Import / Restore
                </h2>
                <div className="card">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleImportFile}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={handleImportClick}
                        disabled={importing}
                        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>📥</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {importing ? 'Importing...' : 'Import Archive'}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    Restore from a .zip archive — replaces all current data
                                </div>
                            </div>
                            {importing ? (
                                <RefreshCw size={20} className="spinning" style={{ color: 'var(--color-text-muted)' }} />
                            ) : (
                                <Upload size={20} style={{ color: 'var(--color-text-muted)' }} />
                            )}
                        </div>
                    </button>

                    {/* Import Result */}
                    {importResult && (
                        <div style={{
                            padding: '1rem',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                        }}>
                            {importResult.success ? (
                                <>
                                    <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>Import Successful!</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            Restored: {importResult.data.locations} locations, {importResult.data.items} items, {importResult.data.outfits} outfits, {importResult.data.history} history entries
                                            {importResult.data.uploads > 0 && `, ${importResult.data.uploads} images`}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>Import Failed</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            {importResult.error}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
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
