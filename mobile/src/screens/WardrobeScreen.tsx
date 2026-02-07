import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Image,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { wardrobeApi, locationApi } from '../services/api';
import FormModal, { FAB } from '../components/FormModal';

const categoryLabels: { [key: string]: string } = {
    tshirt: '👕 T-Shirt',
    shirt: '👔 Shirt',
    pants: '👖 Pants',
    jeans: '👖 Jeans',
    shorts: '🩳 Shorts',
    jacket: '🧥 Jacket',
    sweater: '🧶 Sweater',
    hoodie: '🧥 Hoodie',
    dress: '👗 Dress',
    skirt: '👗 Skirt',
    underwear: '🩲 Underwear',
    socks: '🧦 Socks',
    other: '👚 Other',
};

const cleanlinessColors: { [key: string]: string } = {
    fresh: colors.success,
    worn: colors.warning,
    dirty: colors.error,
    washing: colors.info,
};

const cleanlinessIcons: { [key: string]: string } = {
    fresh: '✨',
    worn: '👕',
    dirty: '🧺',
    washing: '🌀',
};

interface ClothingItem {
    id: string;
    name: string;
    category: string;
    cleanliness: string;
    wear_count_since_wash: number;
    max_wears_before_wash: number;
    can_rewear: boolean;
    color?: string;
    image_url?: string;
}

interface StatCardProps {
    icon: string;
    value: number;
    label: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => (
    <View style={[styles.statCard, { borderBottomColor: color, borderBottomWidth: 3 }]}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

interface ClothingCardProps {
    item: ClothingItem;
    onWear: () => void;
    onWash: () => void;
    onLaundry: () => void;
}

const ClothingCard: React.FC<ClothingCardProps> = ({ item, onWear, onWash, onLaundry }) => {
    const statusColor = cleanlinessColors[item.cleanliness] || colors.textMuted;
    const wearProgress = item.wear_count_since_wash / item.max_wears_before_wash;

    return (
        <View style={styles.clothingCard}>
            {/* Image or Placeholder */}
            {item.image_url ? (
                <Image
                    source={{ uri: item.image_url }}
                    style={styles.clothingImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.clothingImage, styles.imagePlaceholder]}>
                    <Text style={styles.placeholderIcon}>👕</Text>
                </View>
            )}

            {/* Content */}
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemCategory}>
                            {categoryLabels[item.category] || item.category}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={{ fontSize: 12 }}>{cleanlinessIcons[item.cleanliness]}</Text>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {item.cleanliness}
                        </Text>
                    </View>
                </View>

                {/* Wear Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min(wearProgress * 100, 100)}%`,
                                    backgroundColor: wearProgress >= 1 ? colors.error : wearProgress >= 0.7 ? colors.warning : colors.success
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {item.wear_count_since_wash}/{item.max_wears_before_wash} wears
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    {item.can_rewear && (
                        <TouchableOpacity style={styles.actionBtn} onPress={onWear}>
                            <Text style={styles.actionIcon}>👕</Text>
                            <Text style={styles.actionText}>Wear</Text>
                        </TouchableOpacity>
                    )}
                    {item.cleanliness === 'dirty' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={onLaundry}>
                            <Text style={styles.actionIcon}>🧺</Text>
                            <Text style={styles.actionText}>Laundry</Text>
                        </TouchableOpacity>
                    )}
                    {(item.cleanliness === 'washing' || item.cleanliness === 'dirty') && (
                        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onWash}>
                            <Text style={styles.actionIcon}>✨</Text>
                            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Washed</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

export default function WardrobeScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState<any[]>([]);

    // Modal states
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('tshirt');

    const loadData = async () => {
        try {
            const [itemsRes, statsRes, locRes] = await Promise.all([
                wardrobeApi.list(),
                wardrobeApi.stats(),
                locationApi.list(),
            ]);
            setItems(itemsRes.data);
            setStats(statsRes.data);
            setLocations(locRes.data);
        } catch (error) {
            console.error('Failed to load wardrobe:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const handleAddClothing = async (data: Record<string, string>) => {
        try {
            setActionLoading(true);
            await wardrobeApi.create({
                name: data.name,
                category: selectedCategory,
                color: data.color,
                max_wears_before_wash: parseInt(data.max_wears) || 3,
            });
            setAddModalVisible(false);
            Alert.alert('Success', 'Clothing item added!');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to add clothing');
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleWear = async (id: string) => {
        try {
            await wardrobeApi.wear(id);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to mark as worn');
        }
    };

    const handleWash = async (id: string) => {
        try {
            await wardrobeApi.wash(id);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to mark as washed');
        }
    };

    const handleLaundry = async (id: string) => {
        try {
            await wardrobeApi.laundry(id);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to move to laundry');
        }
    };

    if (loading) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={styles.loadingIcon}>👕</Text>
                <Text style={globalStyles.textMuted}>Loading wardrobe...</Text>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accentPrimary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerIcon}>👕</Text>
                    <Text style={styles.headerTitle}>Your Wardrobe</Text>
                    <Text style={styles.headerSubtitle}>Track what you wear</Text>
                </View>

                {/* Stats */}
                {stats && (
                    <View style={styles.statsRow}>
                        <StatCard icon="👕" value={stats.total_items} label="Total" color={colors.accentPrimary} />
                        <StatCard icon="✨" value={stats.fresh_count} label="Fresh" color={colors.success} />
                        <StatCard icon="👔" value={stats.worn_count} label="Worn" color={colors.warning} />
                        <StatCard icon="🧺" value={stats.dirty_count} label="Dirty" color={colors.error} />
                    </View>
                )}

                {/* Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Your Clothes ({items.length})
                    </Text>
                    {items.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>👕</Text>
                            <Text style={styles.emptyTitle}>No clothes yet</Text>
                            <Text style={styles.emptyText}>Tap + to add your first item</Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => setAddModalVisible(true)}
                            >
                                <Text style={styles.emptyButtonText}>+ Add Clothing</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.itemsList}>
                            {items.map((item) => (
                                <ClothingCard
                                    key={item.id}
                                    item={item}
                                    onWear={() => handleWear(item.id)}
                                    onWash={() => handleWash(item.id)}
                                    onLaundry={() => handleLaundry(item.id)}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add Clothing FAB */}
            <FAB icon="➕" onPress={() => setAddModalVisible(true)} color="#a855f7" />

            {/* Add Clothing Modal */}
            <FormModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSubmit={handleAddClothing}
                title="Add Clothing"
                icon="👕"
                loading={actionLoading}
                submitLabel="Add to Wardrobe"
                accentColor="#a855f7"
                fields={[
                    { key: 'name', label: 'Item Name', placeholder: 'e.g., "Blue Polo Shirt"', required: true },
                    { key: 'color', label: 'Color', placeholder: 'e.g., "Navy Blue"' },
                    { key: 'max_wears', label: 'Max Wears Before Wash', keyboardType: 'numeric' },
                ]}
                initialValues={{ name: '', color: '', max_wears: '3' }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 120, // Extra padding for tab bar
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    loadingIcon: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    // Header
    header: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        backgroundColor: '#a855f720',
    },
    headerIcon: {
        fontSize: 48,
        marginBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        marginTop: -spacing.md,
        gap: spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    statIcon: {
        fontSize: 18,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 10,
        color: colors.textMuted,
    },
    // Section
    section: {
        paddingHorizontal: spacing.md,
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    // Items
    itemsList: {
        gap: spacing.md,
    },
    clothingCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    clothingImage: {
        width: '100%',
        height: 140,
    },
    imagePlaceholder: {
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderIcon: {
        fontSize: 48,
        opacity: 0.5,
    },
    cardContent: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    itemCategory: {
        fontSize: 12,
        color: colors.textMuted,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    // Progress
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: colors.bgTertiary,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 11,
        color: colors.textMuted,
    },
    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    actionBtnPrimary: {
        backgroundColor: colors.accentPrimary,
    },
    actionIcon: {
        fontSize: 14,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    // Empty State
    emptyState: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.xxl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyIcon: {
        fontSize: 56,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    emptyButton: {
        backgroundColor: '#a855f7' + '20',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#a855f7',
    },
});
