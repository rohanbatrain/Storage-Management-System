import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../styles/theme';
import { wardrobeApi } from '../services/api';
import { FAB } from '../components/FormModal';

export default function OutfitsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [outfits, setOutfits] = useState<any[]>([]);
    const [clothingItems, setClothingItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Create modal state
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [outfitName, setOutfitName] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [createLoading, setCreateLoading] = useState(false);

    const loadData = async () => {
        try {
            const [outfitsRes, clothingRes] = await Promise.all([
                wardrobeApi.listOutfits(),
                wardrobeApi.list(),
            ]);
            setOutfits(outfitsRes.data);
            setClothingItems(clothingRes.data);
        } catch (error) {
            console.error('Failed to load outfits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const handleWearOutfit = async (id: string) => {
        try {
            setActionLoading(id);
            await wardrobeApi.wearOutfit(id);
            Alert.alert('Logged! 👔', 'Outfit wear recorded for all items');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to log outfit wear');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteOutfit = async (id: string, name: string) => {
        Alert.alert(
            'Delete Outfit?',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await wardrobeApi.deleteOutfit(id);
                            Alert.alert('Deleted', 'Outfit removed');
                            loadData();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.detail || 'Failed to delete');
                        }
                    }
                }
            ]
        );
    };

    const handleCreateOutfit = async () => {
        if (!outfitName.trim()) {
            Alert.alert('Error', 'Please enter an outfit name');
            return;
        }
        if (selectedItems.length < 2) {
            Alert.alert('Error', 'Select at least 2 items for an outfit');
            return;
        }

        try {
            setCreateLoading(true);
            await wardrobeApi.createOutfit({
                name: outfitName.trim(),
                item_ids: selectedItems,
            });
            Alert.alert('Created! ✨', 'Outfit saved successfully');
            setCreateModalVisible(false);
            setOutfitName('');
            setSelectedItems([]);
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create outfit');
        } finally {
            setCreateLoading(false);
        }
    };

    const toggleItemSelection = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getItemName = (itemId: string) => {
        const item = clothingItems.find(i => i.id === itemId);
        return item?.name || 'Unknown Item';
    };

    const renderOutfit = (outfit: any) => {
        const isLoading = actionLoading === outfit.id;
        const itemNames = (outfit.item_ids || []).slice(0, 4).map(getItemName);

        return (
            <View key={outfit.id} style={styles.outfitCard}>
                <View style={styles.outfitHeader}>
                    <Text style={styles.outfitName}>{outfit.name}</Text>
                    <View style={styles.outfitStats}>
                        <Text style={styles.wearCount}>{outfit.wear_count || 0}x worn</Text>
                        {outfit.rating && (
                            <Text style={styles.rating}>⭐ {outfit.rating}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.itemsList}>
                    {itemNames.map((name: string, idx: number) => (
                        <View key={idx} style={styles.itemChip}>
                            <Text style={styles.itemChipText}>{name}</Text>
                        </View>
                    ))}
                    {(outfit.item_ids || []).length > 4 && (
                        <Text style={styles.moreItems}>
                            +{outfit.item_ids.length - 4} more
                        </Text>
                    )}
                </View>

                <View style={styles.outfitActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.accentPrimary }]}
                        onPress={() => handleWearOutfit(outfit.id)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.actionText}>👔 Wear Today</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.error + '20' }]}
                        onPress={() => handleDeleteOutfit(outfit.id, outfit.name)}
                    >
                        <Text style={[styles.actionText, { color: colors.error }]}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.accentPrimary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>👔 Outfits</Text>
                <Text style={styles.subtitle}>
                    {outfits.length} saved outfit{outfits.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Outfits List */}
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accentPrimary}
                    />
                }
            >
                {outfits.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>👔</Text>
                        <Text style={styles.emptyTitle}>No Outfits Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Create outfit combinations to quickly log what you wear
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => setCreateModalVisible(true)}
                        >
                            <Text style={styles.emptyButtonText}>+ Create Outfit</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    outfits.map(renderOutfit)
                )}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* FAB */}
            <FAB icon="➕" onPress={() => setCreateModalVisible(true)} color={colors.accentPrimary} />

            {/* Create Outfit Modal */}
            <Modal
                visible={createModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Outfit</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Outfit name (e.g., 'Casual Friday')"
                            placeholderTextColor={colors.textMuted}
                            value={outfitName}
                            onChangeText={setOutfitName}
                        />

                        <Text style={styles.selectLabel}>
                            Select Items ({selectedItems.length} selected)
                        </Text>

                        <ScrollView style={styles.itemsScroll}>
                            {clothingItems.map(item => {
                                const isSelected = selectedItems.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.selectableItem,
                                            isSelected && styles.selectableItemActive
                                        ]}
                                        onPress={() => toggleItemSelection(item.id)}
                                    >
                                        <Text style={styles.selectCheck}>
                                            {isSelected ? '✓' : '○'}
                                        </Text>
                                        <Text style={styles.selectItemName}>{item.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[
                                styles.createBtn,
                                (selectedItems.length < 2 || !outfitName.trim()) && styles.createBtnDisabled
                            ]}
                            onPress={handleCreateOutfit}
                            disabled={createLoading || selectedItems.length < 2 || !outfitName.trim()}
                        >
                            {createLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.createBtnText}>Create Outfit</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
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
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 4,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    outfitCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    outfitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    outfitName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    outfitStats: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    wearCount: {
        fontSize: 12,
        color: colors.textMuted,
    },
    rating: {
        fontSize: 12,
        color: colors.warning,
    },
    itemsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    itemChip: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    itemChipText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    moreItems: {
        fontSize: 12,
        color: colors.textMuted,
        alignSelf: 'center',
    },
    outfitActions: {
        flexDirection: 'row',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyButton: {
        marginTop: spacing.lg,
        backgroundColor: colors.accentPrimary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: colors.bgSecondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    closeBtn: {
        fontSize: 20,
        color: colors.textMuted,
    },
    input: {
        backgroundColor: colors.bgTertiary,
        margin: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    selectLabel: {
        paddingHorizontal: spacing.lg,
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    itemsScroll: {
        maxHeight: 300,
        paddingHorizontal: spacing.lg,
    },
    selectableItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        backgroundColor: colors.bgTertiary,
        gap: spacing.sm,
    },
    selectableItemActive: {
        backgroundColor: colors.accentPrimary + '20',
        borderWidth: 1,
        borderColor: colors.accentPrimary,
    },
    selectCheck: {
        fontSize: 16,
        color: colors.accentPrimary,
        fontWeight: '700',
    },
    selectItemName: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    createBtn: {
        backgroundColor: colors.accentPrimary,
        margin: spacing.lg,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    createBtnDisabled: {
        opacity: 0.5,
    },
    createBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
