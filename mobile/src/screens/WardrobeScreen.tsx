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
import { colors, spacing, borderRadius, typography, globalStyles } from '../styles/theme';
import { wardrobeApi, locationApi } from '../services/api';

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

interface ClothingCardProps {
    item: ClothingItem;
    onWear: () => void;
    onWash: () => void;
    onLaundry: () => void;
}

const ClothingCard: React.FC<ClothingCardProps> = ({ item, onWear, onWash, onLaundry }) => (
    <View style={styles.clothingCard}>
        {item.image_url && (
            <Image
                source={{ uri: item.image_url }}
                style={styles.clothingImage}
                resizeMode="cover"
            />
        )}
        <View style={globalStyles.spaceBetween}>
            <View style={{ flex: 1 }}>
                <Text style={globalStyles.text}>{item.name}</Text>
                <Text style={globalStyles.textMuted}>
                    {categoryLabels[item.category] || item.category}
                </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: cleanlinessColors[item.cleanliness] + '30' }]}>
                <Text style={[styles.badgeText, { color: cleanlinessColors[item.cleanliness] }]}>
                    {item.cleanliness}
                </Text>
            </View>
        </View>
        <Text style={globalStyles.textSecondary}>
            Wears: {item.wear_count_since_wash} / {item.max_wears_before_wash}
        </Text>
        <View style={styles.actionsRow}>
            {item.can_rewear && (
                <TouchableOpacity style={globalStyles.btnPrimary} onPress={onWear}>
                    <Text style={globalStyles.btnText}>👕 Wear</Text>
                </TouchableOpacity>
            )}
            {item.cleanliness === 'dirty' && (
                <TouchableOpacity style={globalStyles.btnSecondary} onPress={onLaundry}>
                    <Text style={globalStyles.btnText}>🧺 Laundry</Text>
                </TouchableOpacity>
            )}
            {(item.cleanliness === 'washing' || item.cleanliness === 'dirty') && (
                <TouchableOpacity style={globalStyles.btnSecondary} onPress={onWash}>
                    <Text style={globalStyles.btnText}>✨ Washed</Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);

export default function WardrobeScreen() {
    const navigation = useNavigation<any>();
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const [itemsRes, statsRes] = await Promise.all([
                wardrobeApi.list(),
                wardrobeApi.stats(),
            ]);
            setItems(itemsRes.data);
            setStats(statsRes.data);
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
                <Text style={globalStyles.textMuted}>Loading wardrobe...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={globalStyles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.accentPrimary}
                />
            }
        >
            {/* Stats */}
            {stats && (
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: colors.accentPrimary }]}>
                            {stats.total_items}
                        </Text>
                        <Text style={globalStyles.textMuted}>Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: colors.success }]}>
                            {stats.fresh_count}
                        </Text>
                        <Text style={globalStyles.textMuted}>Fresh</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: colors.warning }]}>
                            {stats.worn_count}
                        </Text>
                        <Text style={globalStyles.textMuted}>Worn</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: colors.error }]}>
                            {stats.dirty_count}
                        </Text>
                        <Text style={globalStyles.textMuted}>Dirty</Text>
                    </View>
                </View>
            )}

            {/* Items */}
            <View style={styles.section}>
                <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>
                    👕 Your Clothes ({items.length})
                </Text>
                {items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ fontSize: 48, marginBottom: spacing.md }}>👕</Text>
                        <Text style={globalStyles.text}>No clothes yet</Text>
                        <Text style={globalStyles.textMuted}>Add items from the web app</Text>
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
    );
}

const styles = StyleSheet.create({
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    statValue: {
        fontSize: typography.xxl,
        fontWeight: '700',
    },
    section: {
        marginBottom: spacing.xl,
    },
    itemsList: {
        gap: spacing.md,
    },
    clothingCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    clothingImage: {
        width: '100%',
        height: 120,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
    },
    badge: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    badgeText: {
        fontSize: typography.xs,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    emptyState: {
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
    },
});
