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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { wardrobeApi } from '../services/api';

const cleanlinessColors: { [key: string]: string } = {
    clean: colors.success,
    fresh: colors.success,
    worn: colors.warning,
    dirty: colors.error,
    washing: colors.info,
};

const categoryLabels: { [key: string]: string } = {
    dress_shirt: '👔 Dress Shirt',
    blazer: '🎩 Blazer',
    tshirt: '👕 T-Shirt',
    polo: '👕 Polo',
    jeans: '👖 Jeans',
    shorts: '🩳 Shorts',
    jacket: '🧥 Jacket',
    hoodie: '🧥 Hoodie',
    underwear: '🩲 Underwear',
    socks: '🧦 Socks',
};

type TabType = 'dirty' | 'worn' | 'rewear';

export default function LaundryScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<TabType>('dirty');
    const [laundryItems, setLaundryItems] = useState<any[]>([]);
    const [rewearItems, setRewearItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [laundryRes, rewearRes] = await Promise.all([
                wardrobeApi.getLaundryItems(),
                wardrobeApi.getRewearSafeItems(),
            ]);
            setLaundryItems(laundryRes.data);
            setRewearItems(rewearRes.data);
        } catch (error) {
            console.error('Failed to load laundry:', error);
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

    const handleWash = async (id: string) => {
        try {
            setActionLoading(id);
            await wardrobeApi.wash(id);
            Alert.alert('Done! ✨', 'Item marked as clean');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to wash item');
        } finally {
            setActionLoading(null);
        }
    };

    const handleWear = async (id: string) => {
        try {
            setActionLoading(id);
            await wardrobeApi.wear(id);
            Alert.alert('Logged! 👕', 'Wear recorded');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to log wear');
        } finally {
            setActionLoading(null);
        }
    };

    // Filter items based on tab
    const dirtyItems = laundryItems.filter(i => i.item_data?.clothing?.cleanliness === 'dirty');
    const wornItems = laundryItems.filter(i => i.item_data?.clothing?.cleanliness === 'worn');

    const getDisplayItems = () => {
        switch (activeTab) {
            case 'dirty': return dirtyItems;
            case 'worn': return wornItems;
            case 'rewear': return rewearItems;
            default: return [];
        }
    };

    const displayItems = getDisplayItems();

    const renderItem = (item: any) => {
        const clothing = item.item_data?.clothing || {};
        const cleanliness = clothing.cleanliness || 'clean';
        const category = clothing.category || 'other';
        const wearCount = clothing.wear_count_since_wash || 0;
        const maxWears = clothing.max_wears_before_wash || 3;
        const isLoading = actionLoading === item.id;

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => navigation.navigate('ClothingDetail', { id: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.itemHeader}>
                    <View style={[styles.statusDot, { backgroundColor: cleanlinessColors[cleanliness] }]} />
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.wearBadge}>{wearCount}/{maxWears}</Text>
                </View>

                <View style={styles.itemMeta}>
                    <Text style={styles.categoryText}>
                        {categoryLabels[category] || `📦 ${category}`}
                    </Text>
                    {clothing.color && (
                        <Text style={styles.colorText}>• {clothing.color}</Text>
                    )}
                </View>

                <View style={styles.itemActions}>
                    {activeTab === 'rewear' ? (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.accentPrimary }]}
                            onPress={() => handleWear(item.id)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.actionText}>👕 Wear Again</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.success }]}
                            onPress={() => handleWash(item.id)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.actionText}>✨ Mark Clean</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
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
                <Text style={styles.title}>🧺 Laundry</Text>
                <Text style={styles.subtitle}>
                    {dirtyItems.length} dirty • {wornItems.length} worn • {rewearItems.length} rewearable
                </Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'dirty' && styles.tabActive]}
                    onPress={() => setActiveTab('dirty')}
                >
                    <Text style={styles.tabIcon}>🧺</Text>
                    <Text style={[styles.tabText, activeTab === 'dirty' && styles.tabTextActive]}>
                        Dirty ({dirtyItems.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'worn' && styles.tabActive]}
                    onPress={() => setActiveTab('worn')}
                >
                    <Text style={styles.tabIcon}>👕</Text>
                    <Text style={[styles.tabText, activeTab === 'worn' && styles.tabTextActive]}>
                        Worn ({wornItems.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'rewear' && styles.tabActive]}
                    onPress={() => setActiveTab('rewear')}
                >
                    <Text style={styles.tabIcon}>♻️</Text>
                    <Text style={[styles.tabText, activeTab === 'rewear' && styles.tabTextActive]}>
                        Rewear ({rewearItems.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Items */}
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
                {displayItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>
                            {activeTab === 'dirty' ? '✨' : activeTab === 'worn' ? '👔' : '🎉'}
                        </Text>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'dirty' ? 'No Dirty Items!' :
                                activeTab === 'worn' ? 'Nothing Worn Yet' :
                                    'No Rewearable Items'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'dirty' ? 'All your clothes are clean' :
                                activeTab === 'worn' ? 'Wear something to see it here' :
                                    'Items that can be worn again will appear here'}
                        </Text>
                    </View>
                ) : (
                    displayItems.map(renderItem)
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bulk Wash Button */}
            {(activeTab === 'dirty' || activeTab === 'worn') && displayItems.length > 0 && (
                <TouchableOpacity
                    style={styles.bulkButton}
                    onPress={() => {
                        Alert.alert(
                            'Wash All?',
                            `Mark all ${displayItems.length} items as clean?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Wash All',
                                    onPress: async () => {
                                        for (const item of displayItems) {
                                            await wardrobeApi.wash(item.id);
                                        }
                                        Alert.alert('Done!', 'All items marked as clean');
                                        loadData();
                                    }
                                }
                            ]
                        );
                    }}
                >
                    <Text style={styles.bulkButtonText}>✨ Wash All ({displayItems.length})</Text>
                </TouchableOpacity>
            )}
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
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgSecondary,
        gap: 4,
    },
    tabActive: {
        backgroundColor: colors.accentPrimary + '20',
        borderWidth: 1,
        borderColor: colors.accentPrimary,
    },
    tabIcon: {
        fontSize: 14,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    tabTextActive: {
        color: colors.accentPrimary,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    itemCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    itemName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    wearBadge: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
        gap: spacing.sm,
    },
    categoryText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    colorText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    itemActions: {
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
        fontSize: 48,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
    bulkButton: {
        position: 'absolute',
        bottom: 100,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.success,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    bulkButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
