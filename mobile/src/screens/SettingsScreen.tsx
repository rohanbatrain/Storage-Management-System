import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Share,
    Modal,
    TextInput,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../styles/theme';
import { exportApi, saveApiBaseUrl, locationApi, testBackend, chatApi, identifyApi, testConnectionDetailed } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfirmDialog } from '../components/FormModal';
import { useServer } from '../context/ServerContext';

// Optional: import document picker if available
let DocumentPicker: any = null;
try {
    DocumentPicker = require('react-native-document-picker').default;
} catch (e) {
    // Not installed — import button will use a guidance alert instead
}

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const [exportLoading, setExportLoading] = useState(false);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [apiUrl, setApiUrl] = useState<string>('');
    const [modalVisible, setModalVisible] = useState(false);
    const [tempUrl, setTempUrl] = useState('');
    const [importResult, setImportResult] = useState<any>(null);

    const [voiceMode, setVoiceMode] = useState<'native' | 'whisper' | 'livekit'>('whisper');
    const [voiceModalVisible, setVoiceModalVisible] = useState(false);

    const [currencyPreference, setCurrencyPreference] = useState('₹');
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

    const [deletingAll, setDeletingAll] = useState(false);
    const [confirmDeleteAllVisible, setConfirmDeleteAllVisible] = useState(false);
    const [connTesting, setConnTesting] = useState(false);
    const [connResult, setConnResult] = useState<{ ok: boolean; message: string } | null>(null);

    // AI Models
    const [ollamaPresets, setOllamaPresets] = useState<any>(null);
    const [pullingModel, setPullingModel] = useState<string | null>(null);
    const [pullResult, setPullResult] = useState<{ [key: string]: string }>({});

    // Visual Lens
    const [vlStatus, setVlStatus] = useState<any>(null);

    const { disconnect } = useServer();

    const loadSummary = async () => {
        try {
            const res = await exportApi.exportSummary();
            setSummary(res.data);
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    };

    const loadApiUrl = async () => {
        const url = await AsyncStorage.getItem('sms_server_url');
        if (url) {
            setApiUrl(url);
        }
        const vm = await AsyncStorage.getItem('sms_voice_mode');
        if (vm) setVoiceMode(vm as 'native' | 'whisper' | 'livekit');

        const pref = await AsyncStorage.getItem('sms_currency_preference');
        if (pref) setCurrencyPreference(pref);
    };

    const handleSetVoiceMode = async (mode: 'native' | 'whisper' | 'livekit') => {
        setVoiceMode(mode);
        await AsyncStorage.setItem('sms_voice_mode', mode);
        setVoiceModalVisible(false);
    };

    const handleSetCurrency = async (symbol: string) => {
        setCurrencyPreference(symbol);
        await AsyncStorage.setItem('sms_currency_preference', symbol);
        setCurrencyModalVisible(false);
    };

    const loadOllamaPresets = async () => {
        try {
            const res = await chatApi.getOllamaPresets();
            setOllamaPresets(res.data);
        } catch (error) {
            console.log('Failed to load Ollama presets:', error);
        }
    };

    const loadVisualLens = async () => {
        try {
            const res = await identifyApi.status();
            setVlStatus(res.data);
        } catch (error) {
            console.log('Failed to load Visual Lens status:', error);
        }
    };

    React.useEffect(() => {
        loadSummary();
        loadApiUrl();
        loadOllamaPresets();
        loadVisualLens();

        const interval = setInterval(loadApiUrl, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleEditUrl = () => {
        setTempUrl(apiUrl);
        setModalVisible(true);
    };

    const executeDeleteAll = async () => {
        try {
            setDeletingAll(true);
            setConfirmDeleteAllVisible(false);
            await locationApi.deleteAll();
            Alert.alert('Success', 'All locations and associated data have been permanently deleted.');
            loadSummary();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || error.message || 'Failed to delete locations');
        } finally {
            setDeletingAll(false);
        }
    };

    const handleTestConnection = async () => {
        if (connTesting) return;
        setConnTesting(true);
        setConnResult(null);
        try {
            const start = Date.now();
            await testBackend();
            const ms = Date.now() - start;
            setConnResult({ ok: true, message: `Connected — ${ms}ms` });
        } catch (err: any) {
            setConnResult({ ok: false, message: err.message || 'Server not reachable' });
        } finally {
            setConnTesting(false);
        }
    };

    const saveUrl = async () => {
        if (tempUrl) {
            setModalVisible(false);
            await saveApiBaseUrl(tempUrl);
            setApiUrl(tempUrl);
            Alert.alert('Saved', 'Server connection updated.');
            loadSummary();
            loadOllamaPresets(); // Try to load presets from new server
        }
    };

    const handlePullModel = async (modelId: string) => {
        if (pullingModel) return;
        setPullingModel(modelId);
        try {
            const res = await chatApi.pullOllamaModel(modelId);
            if (res.data.status === 'already_installed') {
                setPullResult(prev => ({ ...prev, [modelId]: 'Installed ✨' }));
                Alert.alert('Installed', `${modelId} is already installed on the server.`);
            } else {
                setPullResult(prev => ({ ...prev, [modelId]: 'Downloading... ⏳' }));
                Alert.alert('Download Started', `${modelId} is downloading in the background on the server. This may take several minutes depending on your internet connection.`);

                // Reset visual status after a few seconds
                setTimeout(() => {
                    setPullResult(prev => ({ ...prev, [modelId]: 'Check Server' }));
                }, 10000);
            }
        } catch (error: any) {
            setPullResult(prev => ({ ...prev, [modelId]: 'Failed ❌' }));
            Alert.alert('Error', error.response?.data?.detail || 'Failed to trigger model download');
        } finally {
            setPullingModel(null);
        }
    };

    // --- Export JSON (lightweight) ---
    const handleExport = async () => {
        try {
            setExportLoading(true);
            const res = await exportApi.exportFull();
            const exportData = JSON.stringify(res.data, null, 2);

            await Share.share({
                message: exportData,
                title: 'Storage Manager Backup',
            });

            Alert.alert('Exported!', 'Your data has been exported successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to export data');
        } finally {
            setExportLoading(false);
        }
    };

    // --- Export Archive (.zip with images) ---
    const handleExportArchive = async () => {
        try {
            setArchiveLoading(true);

            // For mobile, we share the archive download URL directly
            // since blob handling on React Native is limited
            const url = await AsyncStorage.getItem('sms_server_url');
            const baseUrl = url || 'http://localhost:8000';
            const archiveUrl = `${baseUrl}/api/export/archive`;

            await Share.share({
                url: archiveUrl,
                title: 'SMS Full Archive',
                message: Platform.OS === 'android'
                    ? `Download your full SMS archive (data + images): ${archiveUrl}`
                    : undefined,
            });
        } catch (error: any) {
            if (error.message !== 'User did not share') {
                Alert.alert('Error', error.message || 'Failed to share archive link');
            }
        } finally {
            setArchiveLoading(false);
        }
    };

    // --- Import Archive ---
    const handleImport = async () => {
        if (!DocumentPicker) {
            Alert.alert(
                'Import Archive',
                'To import on this device, use the web interface at your server URL, or transfer the archive to your new device and use the desktop app.\n\nAlternatively, install react-native-document-picker for native file selection.',
                [{ text: 'OK' }],
            );
            return;
        }

        try {
            const result = await DocumentPicker.pick({
                type: [DocumentPicker.types.zip],
            });

            const file = result[0] || result;

            Alert.alert(
                '⚠️ Replace All Data?',
                'Importing will REPLACE all existing data on this server (locations, items, outfits, history, and images).\n\nThis cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Import & Replace',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setImportLoading(true);
                                setImportResult(null);
                                const res = await exportApi.importArchive(
                                    file.uri,
                                    file.name || 'backup.zip',
                                );
                                setImportResult({
                                    success: true,
                                    data: res.data.restored,
                                });
                                loadSummary();
                                Alert.alert(
                                    '✅ Import Complete',
                                    `Restored ${res.data.restored.locations} locations, ${res.data.restored.items} items, ${res.data.restored.outfits} outfits.`,
                                );
                            } catch (error: any) {
                                const detail = error.response?.data?.detail || error.message || 'Import failed';
                                setImportResult({ success: false, error: detail });
                                Alert.alert('Import Failed', detail);
                            } finally {
                                setImportLoading(false);
                            }
                        },
                    },
                ],
            );
        } catch (error: any) {
            if (!DocumentPicker.isCancel(error)) {
                Alert.alert('Error', error.message || 'Failed to pick file');
            }
        }
    };

    const SettingsItem = ({ icon, title, subtitle, onPress, loading = false, danger = false }: any) => (
        <TouchableOpacity
            style={styles.settingsItem}
            onPress={onPress}
            disabled={loading}
        >
            <Text style={styles.settingsIcon}>{icon}</Text>
            <View style={styles.settingsContent}>
                <Text style={[styles.settingsTitle, danger && { color: colors.error }]}>
                    {title}
                </Text>
                {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
            </View>
            {loading ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
            ) : (
                <Text style={styles.chevron}>→</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>⚙️ Settings</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Data Summary */}
                {summary && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📊 Your Data</Text>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>📍 Locations</Text>
                                <Text style={styles.summaryValue}>{summary.locations_count}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>📦 Items</Text>
                                <Text style={styles.summaryValue}>{summary.items_count}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>👔 Outfits</Text>
                                <Text style={styles.summaryValue}>{summary.outfits_count}</Text>
                            </View>
                            {summary.uploads_count > 0 && (
                                <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                                    <Text style={styles.summaryLabel}>🖼️ Images</Text>
                                    <Text style={styles.summaryValue}>
                                        {summary.uploads_count} ({summary.uploads_size_mb} MB)
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Backup & Export */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💾 Backup & Export</Text>
                    <View style={styles.card}>
                        <SettingsItem
                            icon="📦"
                            title={archiveLoading ? 'Preparing Archive...' : 'Export Full Archive'}
                            subtitle="Complete backup with data + images (.zip)"
                            onPress={handleExportArchive}
                            loading={archiveLoading}
                        />
                        <SettingsItem
                            icon="📤"
                            title="Export Data (JSON)"
                            subtitle="Lightweight backup — database only"
                            onPress={handleExport}
                            loading={exportLoading}
                        />
                        <SettingsItem
                            icon="🖨️"
                            title="Print QR Codes"
                            subtitle="Generate printable PDF with QR codes"
                            onPress={() => navigation.navigate('QRPrint')}
                        />
                    </View>
                </View>

                {/* Import / Restore */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📥 Import / Restore</Text>
                    <View style={styles.card}>
                        <SettingsItem
                            icon="📥"
                            title={importLoading ? 'Importing...' : 'Import Archive'}
                            subtitle="Restore from a .zip archive — replaces all data"
                            onPress={handleImport}
                            loading={importLoading}
                        />
                    </View>
                    {importResult && (
                        <View style={[styles.resultBanner, importResult.success ? styles.resultSuccess : styles.resultError]}>
                            <Text style={styles.resultIcon}>
                                {importResult.success ? '✅' : '❌'}
                            </Text>
                            <Text style={styles.resultText}>
                                {importResult.success
                                    ? `Restored: ${importResult.data.locations} locations, ${importResult.data.items} items, ${importResult.data.outfits} outfits`
                                    : importResult.error}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.error }]}>🚨 Danger Zone</Text>
                    <View style={[styles.card, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                        <SettingsItem
                            icon="🗑️"
                            title={deletingAll ? 'Deleting Data...' : 'Delete All Locations'}
                            subtitle="Permanently erase all locations, items, and history. No undo."
                            onPress={() => setConfirmDeleteAllVisible(true)}
                            loading={deletingAll}
                            danger={true}
                        />
                    </View>
                </View>

                {/* Connection Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🌐 Connection</Text>
                    <View style={styles.card}>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>Server URL</Text>
                            <TouchableOpacity onPress={handleEditUrl}>
                                <Text style={[styles.aboutValue, { color: colors.accentPrimary, textDecorationLine: 'underline' }]}>
                                    {apiUrl || 'Not Set'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>Voice Mode</Text>
                            <TouchableOpacity onPress={() => setVoiceModalVisible(true)}>
                                <Text style={[styles.aboutValue, { color: colors.accentPrimary, textTransform: 'capitalize' }]}>
                                    {voiceMode}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <SettingsItem
                            icon={connTesting ? '⏳' : connResult?.ok ? '✅' : connResult ? '❌' : '🔌'}
                            title={connTesting ? 'Testing...' : 'Test Connection'}
                            subtitle="Check that the server is reachable"
                            onPress={handleTestConnection}
                            loading={connTesting}
                        />
                        <SettingsItem
                            icon="🚪"
                            title="Disconnect Server"
                            subtitle="Log out and return to the connection screen"
                            onPress={() => {
                                Alert.alert(
                                    'Disconnect',
                                    'Are you sure you want to disconnect from this server? You will need to scan its QR code or choose it from history to reconnect.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Disconnect',
                                            style: 'destructive',
                                            onPress: disconnect
                                        }
                                    ]
                                );
                            }}
                            danger={true}
                        />
                    </View>
                    {connResult && (
                        <View style={[
                            styles.resultBanner,
                            connResult.ok ? styles.resultSuccess : styles.resultError,
                        ]}>
                            <Text style={styles.resultIcon}>{connResult.ok ? '✅' : '❌'}</Text>
                            <Text style={styles.resultText}>{connResult.message}</Text>
                        </View>
                    )}
                    <Text style={{ padding: spacing.md, paddingTop: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                        Tap the URL to edit manually, or scan the QR code on your desktop app to auto-connect.
                    </Text>
                </View>

                {/* Voice Agent Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎙️ Voice Assistant</Text>
                    <View style={styles.card}>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>Voice Mode</Text>
                            <TouchableOpacity onPress={() => setVoiceModalVisible(true)}>
                                <Text style={[styles.aboutValue, { color: colors.accentPrimary, textDecorationLine: 'underline', textTransform: 'capitalize' }]}>
                                    {voiceMode}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ padding: spacing.md, fontSize: 13, color: colors.textMuted }}>
                            Native: Apple/Google Dictation (Fast)
                            {'\n'}Whisper: Groq API Endpoint (Accurate)
                            {'\n'}LiveKit: Real-time Audio (Beta)
                        </Text>
                    </View>
                </View>

                {/* AI Models (Ollama) */}
                {ollamaPresets && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🤖 AI Models (Ollama)</Text>
                        <View style={styles.card}>
                            {Object.entries(ollamaPresets).map(([category, models]: [string, any], catIdx) => (
                                <View key={category} style={catIdx > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : {}}>
                                    <View style={{ backgroundColor: colors.bgTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>{category}</Text>
                                    </View>
                                    {models.map((model: any, idx: number) => (
                                        <View key={model.id} style={[styles.modelItem, idx > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : {}]}>
                                            <View style={styles.modelContent}>
                                                <Text style={styles.modelTitle}>{model.name}</Text>
                                                <Text style={styles.modelSubtitle}>{model.id}</Text>
                                                <Text style={styles.modelDesc}>{model.desc}</Text>
                                                {pullResult[model.id] && (
                                                    <Text style={[styles.modelSubtitle, { color: pullResult[model.id].includes('Failed') ? colors.error : colors.success, marginTop: 4 }]}>
                                                        Status: {pullResult[model.id]}
                                                    </Text>
                                                )}
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.downloadBtn, pullingModel === model.id && { opacity: 0.6 }]}
                                                onPress={() => handlePullModel(model.id)}
                                                disabled={pullingModel !== null}
                                            >
                                                {pullingModel === model.id ? (
                                                    <ActivityIndicator size="small" color={colors.accentPrimary} />
                                                ) : (
                                                    <Text style={styles.downloadBtnText}>⬇️</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Visual Lens */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔍 Visual Lens</Text>
                    <View style={styles.card}>
                        {/* Status Row */}
                        {vlStatus && (
                            <View style={{ flexDirection: 'row', padding: spacing.md, gap: spacing.lg }}>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 20, marginBottom: 4 }}>
                                        {vlStatus.model_ready ? '🟢' : '🔴'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                        {vlStatus.model_ready ? 'CLIP Ready' : 'Loading...'}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accentPrimary }}>
                                        {vlStatus.enrolled_items}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.textMuted }}>Enrolled</Text>
                                </View>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accentPrimary }}>
                                        {vlStatus.total_reference_images}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.textMuted }}>Photos</Text>
                                </View>
                            </View>
                        )}

                        {/* Active Model */}
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1 }}>
                                    CLIP ViT-B/32
                                </Text>
                                <View style={{ backgroundColor: '#22c55e20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#22c55e' }}>Auto-Managed</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                sentence-transformers/clip-ViT-B-32 · 512-d
                            </Text>
                        </View>

                        {/* Capabilities */}
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm }}>✨ Capabilities</Text>
                            {[
                                { icon: '🔎', title: 'Text-to-Image Search', desc: 'Find items by typing descriptions' },
                                { icon: '📷', title: 'Photo Identification', desc: 'Snap a photo to identify enrolled items' },
                                { icon: '✂️', title: 'Background Removal', desc: 'Auto-strips backgrounds for cleaner matches' },
                                { icon: '🏷️', title: 'AI Auto-Tagging', desc: 'Extracts color, category, brand & style on enrollment' },
                            ].map((f, i) => (
                                <View key={i} style={[styles.vlFeature, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                                    <Text style={{ fontSize: 16, marginRight: spacing.sm }}>{f.icon}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{f.title}</Text>
                                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{f.desc}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Formatting */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💱 Formatting</Text>
                    <View style={styles.card}>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>Currency Symbol</Text>
                            <TouchableOpacity onPress={() => setCurrencyModalVisible(true)}>
                                <Text style={[styles.aboutValue, { color: colors.accentPrimary, textDecorationLine: 'underline', textTransform: 'uppercase' }]}>
                                    {currencyPreference}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ padding: spacing.md, fontSize: 13, color: colors.textMuted }}>
                            Select the default symbol (₹, $) to display on Analytics and Wardrobe tabs.
                        </Text>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ℹ️ About</Text>
                    <View style={styles.card}>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>Version</Text>
                            <Text style={styles.aboutValue}>0.0.1</Text>
                        </View>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>App</Text>
                            <Text style={styles.aboutValue}>Storage Management System</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* URL Edit Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Server URL</Text>
                        <Text style={styles.modalText}>
                            Enter the address of your SMS desktop or Docker server (e.g. http://192.168.1.100:8000).
                        </Text>
                        <TextInput
                            style={styles.textInput}
                            value={tempUrl}
                            onChangeText={setTempUrl}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            placeholder="http://"
                            placeholderTextColor={colors.textMuted}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accentPrimary }]} onPress={saveUrl}>
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Voice Mode Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={voiceModalVisible}
                onRequestClose={() => setVoiceModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Voice Mode</Text>
                        <Text style={styles.modalText}>
                            Choose your preferred transcription and interaction engine for voice commands.
                        </Text>

                        <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                            <TouchableOpacity
                                style={[styles.textInput, voiceMode === 'native' && { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary + '15' }, { marginBottom: 0, padding: spacing.md }]}
                                onPress={() => handleSetVoiceMode('native')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>Native Dictation</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Uses iOS/Android built-in speech recognition. Fast and free.</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.textInput, voiceMode === 'whisper' && { borderColor: '#8b5cf6', backgroundColor: '#8b5cf615' }, { marginBottom: 0, padding: spacing.md }]}
                                onPress={() => handleSetVoiceMode('whisper')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>Whisper (Groq API)</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Sends audio to server for high-accuracy processing.</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.textInput, voiceMode === 'livekit' && { borderColor: '#ef4444', backgroundColor: '#ef444415' }, { marginBottom: 0, padding: spacing.md }]}
                                onPress={() => handleSetVoiceMode('livekit')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>LiveKit (Beta)</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Experimental real-time voice interaction with interruption support.</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, { width: '100%' }]} onPress={() => setVoiceModalVisible(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Currency Mode Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={currencyModalVisible}
                onRequestClose={() => setCurrencyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Currency Format</Text>
                        <Text style={styles.modalText}>
                            Choose the currency symbol used on the Analytics report.
                        </Text>

                        <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                            <TouchableOpacity
                                style={[styles.textInput, currencyPreference === '₹' && { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary + '15' }, { marginBottom: 0, padding: spacing.md }]}
                                onPress={() => handleSetCurrency('₹')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>₹ - Indian Rupee (INR)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.textInput, currencyPreference === '$' && { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary + '15' }, { marginBottom: 0, padding: spacing.md }]}
                                onPress={() => handleSetCurrency('$')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>$ - US Dollar (USD)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.textInput, currencyPreference === '£' && { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary + '15' }, { marginBottom: 0, padding: spacing.md }]}
                                onPress={() => handleSetCurrency('£')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>£ - British Pound (GBP)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.textInput, currencyPreference === '€' && { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary + '15' }, { marginBottom: 0, padding: spacing.md }]}
                                onPress={() => handleSetCurrency('€')}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>€ - Euro (EUR)</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, { width: '100%' }]} onPress={() => setCurrencyModalVisible(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete All Confirmation Dialog */}
            <ConfirmDialog
                visible={confirmDeleteAllVisible}
                title="Extreme Warning"
                message={"You are about to permanently delete ALL locations, items, outfits, and movement history.\n\nThis action CANNOT be undone, and there is no recycle bin. If you do not have a backup, your data is gone forever.\n\nAre you absolutely sure?"}
                confirmLabel="Yes, Delete It All"
                onConfirm={executeDeleteAll}
                onClose={() => setConfirmDeleteAllVisible(false)}
                loading={deletingAll}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    summaryCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    summaryLabel: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingsIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    settingsContent: {
        flex: 1,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    settingsSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    chevron: {
        fontSize: 16,
        color: colors.textMuted,
    },
    aboutItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    aboutLabel: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    aboutValue: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    // Import result banner
    resultBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    resultSuccess: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    resultError: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    resultIcon: {
        fontSize: 18,
    },
    resultText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    modalText: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.lg,
    },
    textInput: {
        backgroundColor: colors.bgPrimary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.textPrimary,
        fontSize: 16,
        marginBottom: spacing.xl,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
    },
    modalBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
    },
    modalBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    // Models
    modelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    modelContent: {
        flex: 1,
        marginRight: spacing.sm,
    },
    modelTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    modelSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    modelDesc: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 4,
    },
    downloadBtn: {
        padding: spacing.sm,
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    downloadBtnText: {
        fontSize: 16,
    },
    // Visual Lens
    vlFeature: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: spacing.sm,
    },
});
