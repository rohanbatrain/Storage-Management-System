import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Linking,
    Switch,
    Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { locationApi, itemApi, wardrobeApi, qrApi, QrPdfOptions } from '../services/api';

type Tab = 'locations' | 'items' | 'clothing';

// QR Size presets
const QR_SIZE_PRESETS = [
    { label: 'S', value: 25, desc: '25mm' },
    { label: 'M', value: 40, desc: '40mm' },
    { label: 'L', value: 50, desc: '50mm' },
    { label: 'XL', value: 65, desc: '65mm' },
];

const DEFAULT_OPTIONS: QrPdfOptions = {
    qr_size: 50,
    page_size: 'letter',
    orientation: 'portrait',
    columns: 3,
    show_labels: true,
    label_font_size: 8,
    include_border: false,
    include_id: false,
};

export default function QRPrintScreen() {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<Tab>('locations');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [optionsExpanded, setOptionsExpanded] = useState(false);
    const [optionsAnim] = useState(new Animated.Value(0));

    // Data
    const [locations, setLocations] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [clothing, setClothing] = useState<any[]>([]);

    // Selection
    const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [selectedClothing, setSelectedClothing] = useState<Set<string>>(new Set());

    // PDF Options
    const [pdfOptions, setPdfOptions] = useState<QrPdfOptions>({ ...DEFAULT_OPTIONS });

    const updateOption = <K extends keyof QrPdfOptions>(key: K, value: QrPdfOptions[K]) => {
        setPdfOptions(prev => ({ ...prev, [key]: value }));
    };

    const resetOptions = () => {
        setPdfOptions({ ...DEFAULT_OPTIONS });
    };

    const toggleOptions = () => {
        const toValue = optionsExpanded ? 0 : 1;
        Animated.spring(optionsAnim, {
            toValue,
            useNativeDriver: false,
            friction: 8,
        }).start();
        setOptionsExpanded(!optionsExpanded);
    };

    const loadData = async () => {
        try {
            const [locRes, itemRes, clothRes] = await Promise.all([
                locationApi.list(),
                itemApi.list(),
                wardrobeApi.list(),
            ]);
            setLocations(locRes.data || []);
            setItems((itemRes.data || []).filter((i: any) => i.item_type !== 'clothing'));
            setClothing(clothRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const toggleSelection = (id: string, type: Tab) => {
        if (type === 'locations') {
            setSelectedLocations(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
                return newSet;
            });
        } else if (type === 'items') {
            setSelectedItems(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
                return newSet;
            });
        } else {
            setSelectedClothing(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
                return newSet;
            });
        }
    };

    const selectAll = (type: Tab) => {
        if (type === 'locations') {
            setSelectedLocations(new Set(locations.map(l => l.id)));
        } else if (type === 'items') {
            setSelectedItems(new Set(items.map(i => i.id)));
        } else {
            setSelectedClothing(new Set(clothing.map(c => c.id)));
        }
    };

    const deselectAll = (type: Tab) => {
        if (type === 'locations') setSelectedLocations(new Set());
        else if (type === 'items') setSelectedItems(new Set());
        else setSelectedClothing(new Set());
    };

    const generatePDF = async () => {
        let ids: string[] = [];
        let type: 'locations' | 'items' = 'locations';

        if (activeTab === 'locations') {
            ids = Array.from(selectedLocations);
            type = 'locations';
        } else if (activeTab === 'items') {
            ids = Array.from(selectedItems);
            type = 'items';
        } else {
            ids = Array.from(selectedClothing);
            type = 'items'; // Clothing is also items
        }

        if (ids.length === 0) {
            Alert.alert('No Selection', 'Please select at least one item to print.');
            return;
        }

        const url = qrApi.getBulkPdfUrl(type, ids, pdfOptions);

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open PDF download link');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const getCurrentData = () => {
        if (activeTab === 'locations') return locations;
        if (activeTab === 'items') return items;
        return clothing;
    };

    const getCurrentSelection = () => {
        if (activeTab === 'locations') return selectedLocations;
        if (activeTab === 'items') return selectedItems;
        return selectedClothing;
    };

    const getOptionsSummary = () => {
        const parts = [];
        const sizePreset = QR_SIZE_PRESETS.find(p => p.value === pdfOptions.qr_size);
        parts.push(sizePreset ? sizePreset.desc : `${pdfOptions.qr_size}mm`);
        parts.push(pdfOptions.page_size === 'a4' ? 'A4' : 'Letter');
        parts.push(pdfOptions.orientation === 'landscape' ? 'Landscape' : 'Portrait');
        parts.push(`${pdfOptions.columns} col`);
        return parts.join(' · ');
    };

    const currentData = getCurrentData();
    const currentSelection = getCurrentSelection();

    if (loading) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={styles.loadingIcon}>🖨️</Text>
                <Text style={globalStyles.textMuted}>Loading...</Text>
            </View>
        );
    }

    const optionsHeight = optionsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 420],
    });

    return (
        <View style={[globalStyles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🖨️ Print QR Codes</Text>
                <Text style={styles.subtitle}>Select items to generate printable PDF</Text>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {(['locations', 'items', 'clothing'] as Tab[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'locations' ? '📍 Locations' : tab === 'items' ? '📦 Items' : '👕 Clothing'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Selection Actions */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => selectAll(activeTab)}>
                    <Text style={styles.actionBtnText}>✅ Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => deselectAll(activeTab)}>
                    <Text style={styles.actionBtnText}>❌ Deselect All</Text>
                </TouchableOpacity>
                <Text style={styles.selectedCount}>{currentSelection.size} selected</Text>
            </View>

            {/* List */}
            <ScrollView
                style={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
            >
                {currentData.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyText}>No {activeTab} found</Text>
                    </View>
                ) : (
                    currentData.map((item: any) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.listItem, currentSelection.has(item.id) && styles.listItemSelected]}
                            onPress={() => toggleSelection(item.id, activeTab)}
                        >
                            <View style={styles.checkbox}>
                                {currentSelection.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                {activeTab === 'items' || activeTab === 'clothing' ? (
                                    <Text style={styles.itemMeta}>
                                        Qty: {item.quantity || 1} {item.quantity > 1 && `(${item.quantity} QR codes)`}
                                    </Text>
                                ) : (
                                    <Text style={styles.itemMeta}>{item.kind || 'Location'}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                {/* Bottom spacing for options panel */}
                <View style={{ height: spacing.xl }} />
            </ScrollView>

            {/* PDF Options Panel */}
            <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionsHeader} onPress={toggleOptions} activeOpacity={0.7}>
                    <View style={styles.optionsHeaderLeft}>
                        <Text style={styles.optionsHeaderIcon}>⚙️</Text>
                        <Text style={styles.optionsHeaderTitle}>PDF Options</Text>
                    </View>
                    <Text style={styles.optionsSummary}>{getOptionsSummary()}</Text>
                    <Text style={styles.optionsChevron}>{optionsExpanded ? '▼' : '▲'}</Text>
                </TouchableOpacity>

                <Animated.View style={[styles.optionsBody, { height: optionsHeight, overflow: 'hidden' }]}>
                    <ScrollView style={styles.optionsScroll} bounces={false}>
                        {/* QR Size */}
                        <View style={styles.optionGroup}>
                            <Text style={styles.optionLabel}>QR Code Size</Text>
                            <View style={styles.segmentedControl}>
                                {QR_SIZE_PRESETS.map(preset => (
                                    <TouchableOpacity
                                        key={preset.value}
                                        style={[
                                            styles.segmentBtn,
                                            pdfOptions.qr_size === preset.value && styles.segmentBtnActive,
                                        ]}
                                        onPress={() => updateOption('qr_size', preset.value)}
                                    >
                                        <Text style={[
                                            styles.segmentBtnLabel,
                                            pdfOptions.qr_size === preset.value && styles.segmentBtnLabelActive,
                                        ]}>
                                            {preset.label}
                                        </Text>
                                        <Text style={[
                                            styles.segmentBtnDesc,
                                            pdfOptions.qr_size === preset.value && styles.segmentBtnDescActive,
                                        ]}>
                                            {preset.desc}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Page Size & Orientation */}
                        <View style={styles.optionRow}>
                            <View style={[styles.optionGroup, { flex: 1 }]}>
                                <Text style={styles.optionLabel}>Page Size</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, pdfOptions.page_size === 'letter' && styles.toggleBtnActive]}
                                        onPress={() => updateOption('page_size', 'letter')}
                                    >
                                        <Text style={[styles.toggleBtnText, pdfOptions.page_size === 'letter' && styles.toggleBtnTextActive]}>Letter</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, pdfOptions.page_size === 'a4' && styles.toggleBtnActive]}
                                        onPress={() => updateOption('page_size', 'a4')}
                                    >
                                        <Text style={[styles.toggleBtnText, pdfOptions.page_size === 'a4' && styles.toggleBtnTextActive]}>A4</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.optionGroup, { flex: 1, marginLeft: spacing.md }]}>
                                <Text style={styles.optionLabel}>Orientation</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, pdfOptions.orientation === 'portrait' && styles.toggleBtnActive]}
                                        onPress={() => updateOption('orientation', 'portrait')}
                                    >
                                        <Text style={[styles.toggleBtnText, pdfOptions.orientation === 'portrait' && styles.toggleBtnTextActive]}>▯</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, pdfOptions.orientation === 'landscape' && styles.toggleBtnActive]}
                                        onPress={() => updateOption('orientation', 'landscape')}
                                    >
                                        <Text style={[styles.toggleBtnText, pdfOptions.orientation === 'landscape' && styles.toggleBtnTextActive]}>▭</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Columns */}
                        <View style={styles.optionGroup}>
                            <View style={styles.optionLabelRow}>
                                <Text style={styles.optionLabel}>Columns</Text>
                                <Text style={styles.optionValue}>{pdfOptions.columns}</Text>
                            </View>
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, pdfOptions.columns! <= 1 && styles.stepperBtnDisabled]}
                                    onPress={() => updateOption('columns', Math.max(1, (pdfOptions.columns || 3) - 1))}
                                    disabled={pdfOptions.columns! <= 1}
                                >
                                    <Text style={styles.stepperBtnText}>−</Text>
                                </TouchableOpacity>
                                <View style={styles.stepperTrack}>
                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                        <TouchableOpacity
                                            key={n}
                                            style={[styles.stepperDot, n === pdfOptions.columns && styles.stepperDotActive]}
                                            onPress={() => updateOption('columns', n)}
                                        >
                                            <Text style={[styles.stepperDotText, n === pdfOptions.columns && styles.stepperDotTextActive]}>{n}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, pdfOptions.columns! >= 6 && styles.stepperBtnDisabled]}
                                    onPress={() => updateOption('columns', Math.min(6, (pdfOptions.columns || 3) + 1))}
                                    disabled={pdfOptions.columns! >= 6}
                                >
                                    <Text style={styles.stepperBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Toggle Options */}
                        <View style={styles.switchGroup}>
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Show Labels</Text>
                                <Switch
                                    value={pdfOptions.show_labels}
                                    onValueChange={(val) => updateOption('show_labels', val)}
                                    trackColor={{ false: colors.bgTertiary, true: colors.accentPrimary + '60' }}
                                    thumbColor={pdfOptions.show_labels ? colors.accentPrimary : colors.textMuted}
                                />
                            </View>

                            {pdfOptions.show_labels && (
                                <View style={styles.sliderRow}>
                                    <Text style={styles.sliderLabel}>Label Size</Text>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={6}
                                        maximumValue={14}
                                        step={1}
                                        value={pdfOptions.label_font_size}
                                        onValueChange={(val) => updateOption('label_font_size', val)}
                                        minimumTrackTintColor={colors.accentPrimary}
                                        maximumTrackTintColor={colors.bgTertiary}
                                        thumbTintColor={colors.accentSecondary}
                                    />
                                    <Text style={styles.sliderValue}>{pdfOptions.label_font_size}pt</Text>
                                </View>
                            )}

                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Draw Borders</Text>
                                <Switch
                                    value={pdfOptions.include_border}
                                    onValueChange={(val) => updateOption('include_border', val)}
                                    trackColor={{ false: colors.bgTertiary, true: colors.accentPrimary + '60' }}
                                    thumbColor={pdfOptions.include_border ? colors.accentPrimary : colors.textMuted}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Show QR Code ID</Text>
                                <Switch
                                    value={pdfOptions.include_id}
                                    onValueChange={(val) => updateOption('include_id', val)}
                                    trackColor={{ false: colors.bgTertiary, true: colors.accentPrimary + '60' }}
                                    thumbColor={pdfOptions.include_id ? colors.accentPrimary : colors.textMuted}
                                />
                            </View>
                        </View>

                        {/* Reset */}
                        <TouchableOpacity style={styles.resetBtn} onPress={resetOptions}>
                            <Text style={styles.resetBtnText}>↺ Reset to Defaults</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </View>

            {/* Generate Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity
                    style={[styles.generateBtn, currentSelection.size === 0 && styles.generateBtnDisabled]}
                    onPress={generatePDF}
                    disabled={currentSelection.size === 0}
                >
                    <Text style={styles.generateBtnText}>
                        📄 Generate PDF ({currentSelection.size} {activeTab === 'locations' ? 'locations' : 'items'})
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    header: {
        padding: spacing.lg,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: colors.accentPrimary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    tabTextActive: {
        color: '#fff',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    actionBtn: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.bgTertiary,
    },
    actionBtnText: {
        fontSize: 12,
        color: colors.textPrimary,
    },
    selectedCount: {
        flex: 1,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '600',
        color: colors.accentPrimary,
    },
    list: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    empty: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    listItemSelected: {
        borderColor: colors.accentPrimary,
        backgroundColor: colors.accentPrimary + '15',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        marginRight: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgTertiary,
    },
    checkmark: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.accentPrimary,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    itemMeta: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },

    // ---- Options Panel ----
    optionsContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgSecondary,
    },
    optionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    optionsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    optionsHeaderIcon: {
        fontSize: 16,
    },
    optionsHeaderTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    optionsSummary: {
        flex: 1,
        textAlign: 'right',
        fontSize: 11,
        color: colors.textMuted,
        marginRight: spacing.sm,
    },
    optionsChevron: {
        fontSize: 10,
        color: colors.textMuted,
    },
    optionsBody: {
        // height controlled by animation
    },
    optionsScroll: {
        paddingHorizontal: spacing.lg,
    },
    optionGroup: {
        marginBottom: spacing.md,
    },
    optionRow: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    optionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    optionLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    optionValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.accentPrimary,
    },

    // Segmented Control (QR size)
    segmentedControl: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    segmentBtnActive: {
        backgroundColor: colors.accentPrimary + '20',
        borderColor: colors.accentPrimary,
    },
    segmentBtnLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textMuted,
    },
    segmentBtnLabelActive: {
        color: colors.accentPrimary,
    },
    segmentBtnDesc: {
        fontSize: 10,
        color: colors.textMuted,
        marginTop: 1,
    },
    segmentBtnDescActive: {
        color: colors.accentSecondary,
    },

    // Toggle Buttons (Page Size / Orientation)
    toggleRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    toggleBtnActive: {
        backgroundColor: colors.accentPrimary + '20',
        borderColor: colors.accentPrimary,
    },
    toggleBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    toggleBtnTextActive: {
        color: colors.accentPrimary,
    },

    // Stepper (Columns)
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    stepperBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    stepperBtnDisabled: {
        opacity: 0.3,
    },
    stepperBtnText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    stepperTrack: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    stepperDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgTertiary,
    },
    stepperDotActive: {
        backgroundColor: colors.accentPrimary,
    },
    stepperDotText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    stepperDotTextActive: {
        color: '#fff',
    },

    // Switch toggles
    switchGroup: {
        marginBottom: spacing.md,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    switchLabel: {
        fontSize: 14,
        color: colors.textPrimary,
    },

    // Slider (Label Size)
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingLeft: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sliderLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        width: 65,
    },
    slider: {
        flex: 1,
        height: 32,
    },
    sliderValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.accentPrimary,
        width: 32,
        textAlign: 'right',
    },

    // Reset button
    resetBtn: {
        alignSelf: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.sm,
        marginBottom: spacing.md,
    },
    resetBtnText: {
        fontSize: 12,
        color: colors.textMuted,
    },

    // Footer
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    generateBtn: {
        backgroundColor: colors.accentPrimary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    generateBtnDisabled: {
        opacity: 0.5,
    },
    generateBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
