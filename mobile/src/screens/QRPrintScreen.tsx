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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { locationApi, itemApi, wardrobeApi, qrApi } from '../services/api';

type Tab = 'locations' | 'items' | 'clothing';

export default function QRPrintScreen() {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<Tab>('locations');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data
    const [locations, setLocations] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [clothing, setClothing] = useState<any[]>([]);

    // Selection
    const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [selectedClothing, setSelectedClothing] = useState<Set<string>>(new Set());

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

        const url = qrApi.getBulkPdfUrl(type, ids);

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
            </ScrollView>

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
