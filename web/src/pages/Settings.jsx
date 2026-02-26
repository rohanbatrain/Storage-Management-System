import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Printer, Archive, RefreshCw, AlertTriangle, CheckCircle, Eye, Cpu, Trash2, X, Wifi, Sparkles, Search, ImageOff } from 'lucide-react';
import { exportApi, identifyApi, chatApi, locationApi, testBackend } from '../services/api';

function Settings() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportingArchive, setExportingArchive] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);
    // Visual Lens state
    const [vlStatus, setVlStatus] = useState(null);

    // AI Assistant state
    const [aiProvider, setAiProvider] = useState('ollama');
    const [aiBaseUrl, setAiBaseUrl] = useState('http://localhost:11434/v1');
    const [aiApiKey, setAiApiKey] = useState('');
    const [aiModel, setAiModel] = useState('qwen3:8b');
    const [aiProviders, setAiProviders] = useState({});
    const [aiTestResult, setAiTestResult] = useState(null);
    const [aiTesting, setAiTesting] = useState(false);
    const [aiSaving, setAiSaving] = useState(false);

    // Danger Zone state
    const [deletingAll, setDeletingAll] = useState(false);
    const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

    // Backend connection test
    const [backendTesting, setBackendTesting] = useState(false);
    const [backendTestResult, setBackendTestResult] = useState(null);

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
        loadAiSettings();
    }, []);

    const loadVisualLens = async () => {
        try {
            const statusRes = await identifyApi.status().catch(() => ({ data: null }));
            setVlStatus(statusRes.data);
        } catch (err) {
            console.error('Visual Lens load failed:', err);
        }
    };

    // AI Assistant handlers
    const loadAiSettings = async () => {
        try {
            const res = await chatApi.getSettings();
            const d = res.data;
            setAiProvider(d.provider || 'ollama');
            setAiBaseUrl(d.base_url || '');
            setAiModel(d.model || '');
            setAiProviders(d.providers || {});
            // Don't overwrite key with masked value
        } catch (err) {
            console.error('AI settings load failed:', err);
        }
    };

    const handleAiProviderChange = (provider) => {
        setAiProvider(provider);
        const preset = aiProviders[provider];
        if (preset) {
            setAiBaseUrl(preset.base_url || '');
            setAiModel(preset.default_model || '');
            if (!preset.needs_key) setAiApiKey('');
        }
        setAiTestResult(null);
    };

    const handleAiSave = async () => {
        try {
            setAiSaving(true);
            await chatApi.updateSettings({
                provider: aiProvider,
                base_url: aiBaseUrl,
                api_key: aiApiKey,
                model: aiModel,
            });
            setAiTestResult({ status: 'saved', message: 'Settings saved!' });
        } catch (err) {
            setAiTestResult({ status: 'error', message: err.response?.data?.detail || 'Save failed' });
        } finally {
            setAiSaving(false);
        }
    };

    const handleAiTest = async () => {
        // Save first, then test
        try {
            setAiTesting(true);
            setAiTestResult(null);
            await chatApi.updateSettings({
                provider: aiProvider,
                base_url: aiBaseUrl,
                api_key: aiApiKey,
                model: aiModel,
            });
            const res = await chatApi.testConnection();
            setAiTestResult({ status: 'ok', message: `✅ Connected! Model: ${res.data.model} — "${res.data.reply}"` });
        } catch (err) {
            setAiTestResult({ status: 'error', message: err.response?.data?.detail || 'Connection failed' });
        } finally {
            setAiTesting(false);
        }
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

    const executeDeleteAll = async () => {
        try {
            setDeletingAll(true);
            setShowConfirmDeleteAll(false);
            await locationApi.deleteAll();
            alert('✅ All locations and associated data have been permanently deleted.');
            loadSummary(); // Refresh counts to 0
        } catch (error) {
            console.error('Failed to delete all locations:', error);
            alert('Failed to delete locations: ' + (error.response?.data?.detail || error.message));
        } finally {
            setDeletingAll(false);
        }
    };

    const handleBackendTest = async () => {
        try {
            setBackendTesting(true);
            setBackendTestResult(null);
            const start = Date.now();
            await testBackend();
            const ms = Date.now() - start;
            setBackendTestResult({ ok: true, message: `✅ Connected — ${ms}ms` });
        } catch (err) {
            setBackendTestResult({ ok: false, message: `❌ ${err.message || 'Server not reachable'}` });
        } finally {
            setBackendTesting(false);
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

            {/* Danger Zone */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🚨 Danger Zone
                </h2>
                <div className="card" style={{ border: '1px solid #ef444430' }}>
                    <button
                        onClick={() => setShowConfirmDeleteAll(true)}
                        disabled={deletingAll}
                        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem' }}>🗑️</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: '#ef4444' }}>
                                    {deletingAll ? 'Deleting Data...' : 'Delete All Locations'}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    Permanently erase all locations, items, and history. No undo.
                                </div>
                            </div>
                            {deletingAll ? (
                                <RefreshCw size={20} className="spinning" style={{ color: '#ef4444' }} />
                            ) : (
                                <Trash2 size={20} style={{ color: '#ef4444' }} />
                            )}
                        </div>
                    </button>
                </div>
            </section>

            {/* Backend Connection */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🌐 Backend Connection
                </h2>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        Test whether the local backend server is reachable.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleBackendTest}
                            disabled={backendTesting}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {backendTesting
                                ? <RefreshCw size={16} className="spinning" />
                                : <Wifi size={16} />}
                            {backendTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        {backendTestResult && (
                            <span style={{
                                fontSize: '0.875rem', fontWeight: 500,
                                color: backendTestResult.ok ? '#22c55e' : '#ef4444',
                            }}>
                                {backendTestResult.message}
                            </span>
                        )}
                    </div>
                </div>
            </section>

            {/* AI Assistant Settings */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🤖 AI Assistant
                </h2>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Language Model</h3>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                            Choose a provider to power the chat assistant. Ollama runs locally for free.
                        </p>

                        {/* Provider selector */}
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                            {['ollama', 'openai', 'openrouter', 'custom'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleAiProviderChange(p)}
                                    style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        borderRadius: 'var(--radius-md)',
                                        border: aiProvider === p ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                                        background: aiProvider === p ? 'var(--color-accent-primary)15' : 'var(--color-bg-tertiary)',
                                        color: aiProvider === p ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                                        fontWeight: 600,
                                        fontSize: 'var(--font-size-sm)',
                                        cursor: 'pointer',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {p === 'ollama' ? '🦙 Ollama' : p === 'openai' ? '🔑 OpenAI' : p === 'openrouter' ? '🌐 OpenRouter' : '⚙️ Custom'}
                                </button>
                            ))}
                        </div>

                        {/* Model */}
                        <div>
                            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Model</label>
                            <input
                                type="text"
                                value={aiModel}
                                onChange={e => setAiModel(e.target.value)}
                                placeholder={aiProvider === 'ollama' ? 'qwen3:8b' : 'gpt-4o-mini'}
                                style={inputStyle}
                            />
                        </div>

                        {/* API Key (not for Ollama) */}
                        {aiProvider !== 'ollama' && (
                            <div>
                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>API Key</label>
                                <input
                                    type="password"
                                    value={aiApiKey}
                                    onChange={e => setAiApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    style={inputStyle}
                                />
                            </div>
                        )}

                        {/* Base URL */}
                        <div>
                            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>API URL</label>
                            <input
                                type="text"
                                value={aiBaseUrl}
                                onChange={e => setAiBaseUrl(e.target.value)}
                                placeholder="http://localhost:11434/v1"
                                style={inputStyle}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                            <button
                                onClick={handleAiSave}
                                disabled={aiSaving}
                                className="btn btn-primary"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            >
                                {aiSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={handleAiTest}
                                disabled={aiTesting}
                                className="btn btn-secondary"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            >
                                {aiTesting ? 'Testing...' : '🔌 Test Connection'}
                            </button>
                        </div>

                        {/* Test result */}
                        {aiTestResult && (
                            <div style={{
                                padding: 'var(--space-sm) var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                background: aiTestResult.status === 'ok' || aiTestResult.status === 'saved'
                                    ? '#22c55e15' : '#ef444415',
                                color: aiTestResult.status === 'ok' || aiTestResult.status === 'saved'
                                    ? '#22c55e' : '#ef4444',
                                border: `1px solid ${aiTestResult.status === 'ok' || aiTestResult.status === 'saved' ? '#22c55e30' : '#ef444430'}`,
                            }}>
                                {aiTestResult.message}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Visual Lens */}
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
                                    {vlStatus.model_ready ? 'CLIP Ready' : 'Loading...'}
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

                {/* Active Model Info */}
                <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        <Cpu size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                        Active Model
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem', borderRadius: 8,
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                                CLIP ViT-B/32
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                sentence-transformers/clip-ViT-B-32 · 512-d embeddings
                            </div>
                        </div>
                        <span style={{
                            fontSize: '0.7rem', fontWeight: 600, color: '#22c55e',
                            background: '#22c55e20', padding: '4px 10px', borderRadius: 8,
                        }}>Auto-Managed</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                        The CLIP model is automatically downloaded and managed by the backend.
                        It supports both image and text queries in a shared embedding space.
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        ✨ Capabilities
                    </div>
                    {[
                        { icon: <Search size={16} />, title: 'Text-to-Image Search', desc: 'Type "red shirt" to find items by description instead of photos' },
                        { icon: <Eye size={16} />, title: 'Photo Identification', desc: 'Take a photo of an item to identify it from enrolled references' },
                        { icon: <ImageOff size={16} />, title: 'Background Removal', desc: 'Automatically strips backgrounds before embedding for cleaner matches (rembg)' },
                        { icon: <Sparkles size={16} />, title: 'AI Auto-Tagging', desc: 'Extracts color, category, brand, and style when enrolling items with a Vision LLM' },
                    ].map((f, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                            padding: '0.6rem 0',
                            borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                        }}>
                            <div style={{ color: 'var(--color-accent-primary)', marginTop: 2, flexShrink: 0 }}>{f.icon}</div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{f.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 1 }}>{f.desc}</div>
                            </div>
                        </div>
                    ))}
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
                        <span style={{ color: 'var(--color-text-primary)' }}>0.0.1</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>App</span>
                        <span style={{ color: 'var(--color-text-primary)' }}>Storage Management System</span>
                    </div>
                </div>
            </section>

            {/* Delete All Confirm Modal */}
            {showConfirmDeleteAll && (
                <div className="modal-overlay" onClick={() => setShowConfirmDeleteAll(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={24} /> Extreme Warning
                            </h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowConfirmDeleteAll(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                                You are about to permanently delete <strong>ALL</strong> locations, items, outfits, and movement history.
                            </p>
                            <p style={{ color: '#ef4444', fontWeight: 600 }}>
                                This action CANNOT be undone, and there is no recycle bin. If you do not have a backup, your data is gone forever.
                            </p>
                            <p style={{ marginTop: '1rem', color: 'var(--color-text-primary)' }}>
                                Are you absolutely sure you want to completely wipe all locations?
                            </p>
                        </div>
                        <div className="modal-footer" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowConfirmDeleteAll(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn"
                                style={{ background: '#ef4444', color: 'white', border: 'none' }}
                                onClick={executeDeleteAll}
                                disabled={deletingAll}
                            >
                                {deletingAll ? 'Deleting...' : 'Yes, Delete Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;

const inputStyle = {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none',
};
