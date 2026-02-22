import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Printer, Archive, RefreshCw, AlertTriangle, CheckCircle, Eye, Cpu, Trash2 } from 'lucide-react';
import { exportApi, identifyApi } from '../services/api';

function Settings() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportingArchive, setExportingArchive] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);
    const modelUploadRef = useRef(null);

    // Visual Lens state
    const [vlStatus, setVlStatus] = useState(null);
    const [vlCatalog, setVlCatalog] = useState([]);
    const [vlModels, setVlModels] = useState([]);
    const [vlLoading, setVlLoading] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [downloadFilename, setDownloadFilename] = useState('');

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
        loadVisualLens();
    }, []);

    const loadVisualLens = async () => {
        try {
            const [statusRes, catalogRes, modelsRes] = await Promise.all([
                identifyApi.status().catch(() => ({ data: null })),
                identifyApi.catalog().catch(() => ({ data: { catalog: [] } })),
                identifyApi.listModels().catch(() => ({ data: { models: [] } })),
            ]);
            setVlStatus(statusRes.data);
            setVlCatalog(catalogRes.data?.catalog || []);
            setVlModels(modelsRes.data?.models || []);
        } catch (err) {
            console.error('Visual Lens load failed:', err);
        }
    };

    const handleModelDownload = async (url, filename) => {
        try {
            setVlLoading(true);
            await identifyApi.downloadModel(url, filename);
            await loadVisualLens();
        } catch (err) {
            alert('Download failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setVlLoading(false);
        }
    };

    const handleModelActivate = async (filename) => {
        try {
            setVlLoading(true);
            await identifyApi.activateModel(filename);
            await loadVisualLens();
        } catch (err) {
            alert('Activation failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setVlLoading(false);
        }
    };

    const handleModelDelete = async (filename) => {
        if (!window.confirm(`Delete model "${filename}"?`)) return;
        try {
            setVlLoading(true);
            await identifyApi.deleteModel(filename);
            await loadVisualLens();
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setVlLoading(false);
        }
    };

    const handleModelUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        try {
            setVlLoading(true);
            await identifyApi.uploadModel(file);
            await loadVisualLens();
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setVlLoading(false);
        }
    };

    const handleUrlDownload = async () => {
        if (!downloadUrl || !downloadFilename) {
            alert('Please enter both URL and filename');
            return;
        }
        await handleModelDownload(downloadUrl, downloadFilename);
        setDownloadUrl('');
        setDownloadFilename('');
    };

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

            {/* Visual Lens — Model Management */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔍 Visual Lens
                </h2>

                {/* Status Card */}
                {vlStatus && (
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>
                                    {vlStatus.model_ready ? '🟢' : '🔴'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    {vlStatus.model_ready ? 'Model Ready' : 'No Model'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                    {vlStatus.enrolled_items}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Enrolled Items</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                    {vlStatus.total_reference_images}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Reference Photos</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Installed Models */}
                {vlModels.length > 0 && (
                    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                            <Cpu size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                            Installed Models
                        </div>
                        {vlModels.map(m => (
                            <div key={m.filename} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.6rem 0', borderTop: '1px solid var(--color-border)',
                            }}>
                                <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                                    {m.filename}
                                    <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>{m.size_mb} MB</span>
                                </span>
                                {m.active ? (
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 600, color: '#22c55e',
                                        background: '#22c55e20', padding: '3px 8px', borderRadius: 8,
                                    }}>Active</span>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleModelActivate(m.filename)}
                                            disabled={vlLoading}
                                            style={{
                                                background: 'var(--color-accent-primary)', color: '#fff',
                                                border: 'none', borderRadius: 6, padding: '4px 10px',
                                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >Activate</button>
                                        <button
                                            onClick={() => handleModelDelete(m.filename)}
                                            disabled={vlLoading}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--color-text-muted)', padding: 4,
                                            }}
                                        ><Trash2 size={14} /></button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Model Catalog */}
                <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        📦 Model Catalog
                    </div>
                    {vlCatalog.map(m => (
                        <div key={m.filename} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 0', borderTop: '1px solid var(--color-border)',
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                                    {m.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                    {m.description} — {m.size_mb} MB
                                </div>
                            </div>
                            {m.installed ? (
                                m.active ? (
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 600, color: '#22c55e',
                                        background: '#22c55e20', padding: '3px 8px', borderRadius: 8,
                                    }}>Active</span>
                                ) : (
                                    <button
                                        onClick={() => handleModelActivate(m.filename)}
                                        disabled={vlLoading}
                                        style={{
                                            background: 'var(--color-accent-primary)', color: '#fff',
                                            border: 'none', borderRadius: 6, padding: '4px 10px',
                                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >Activate</button>
                                )
                            ) : (
                                <button
                                    onClick={() => handleModelDownload(m.url, m.filename)}
                                    disabled={vlLoading}
                                    style={{
                                        background: 'none', border: '1px solid var(--color-border)',
                                        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)',
                                    }}
                                >
                                    <Download size={12} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                    Install
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Custom Model Upload + URL */}
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        ⬆️ Add Custom Model
                    </div>

                    {/* Upload */}
                    <input ref={modelUploadRef} type="file" accept=".onnx" onChange={handleModelUpload} style={{ display: 'none' }} />
                    <button
                        onClick={() => modelUploadRef.current?.click()}
                        disabled={vlLoading}
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: 8,
                            border: '1px dashed var(--color-border)', background: 'none',
                            color: 'var(--color-text-secondary)', cursor: 'pointer',
                            fontSize: '0.85rem', marginBottom: '0.75rem',
                        }}
                    >
                        <Upload size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                        Upload .onnx file
                    </button>

                    {/* Download from URL */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Download URL"
                            value={downloadUrl}
                            onChange={e => setDownloadUrl(e.target.value)}
                            style={{
                                flex: 2, padding: '0.5rem 0.75rem', borderRadius: 6,
                                border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)', fontSize: '0.8rem',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="filename.onnx"
                            value={downloadFilename}
                            onChange={e => setDownloadFilename(e.target.value)}
                            style={{
                                flex: 1, padding: '0.5rem 0.75rem', borderRadius: 6,
                                border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)', fontSize: '0.8rem',
                            }}
                        />
                        <button
                            onClick={handleUrlDownload}
                            disabled={vlLoading || !downloadUrl || !downloadFilename}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: 6,
                                border: 'none', background: 'var(--color-accent-primary)',
                                color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                opacity: vlLoading ? 0.5 : 1,
                            }}
                        >
                            {vlLoading ? '...' : 'Download'}
                        </button>
                    </div>
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
