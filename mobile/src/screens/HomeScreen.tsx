import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, globalStyles } from '../styles/theme';
import { locationApi, itemApi } from '../services/api';

const { width } = Dimensions.get('window');

interface StatCardProps {
    icon: string;
    value: number;
    label: string;
    color: string;
    gradient?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

interface ActionCardProps {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    isPrimary?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, subtitle, onPress, isPrimary }) => (
    <TouchableOpacity
        style={[styles.actionCard, isPrimary && styles.actionCardPrimary]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.actionIconWrapper, isPrimary && styles.actionIconPrimary]}>
            <Text style={styles.actionIcon}>{icon}</Text>
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
);

interface ItemRowProps {
    item: any;
    onPress: () => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, onPress }) => (
    <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.itemIconWrapper}>
            <Text style={{ fontSize: 20 }}>📦</Text>
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemLocation}>
                {item.current_location?.name || 'Unknown location'}
            </Text>
        </View>
        {item.is_temporary_placement && (
            <View style={styles.tempBadge}>
                <Text style={styles.tempBadgeText}>Temp</Text>
            </View>
        )}
        <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
);

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        locations: 0,
        items: 0,
        temporary: 0,
    });
    const [temporaryItems, setTemporaryItems] = useState<any[]>([]);

    const loadData = async () => {
        try {
            const locationsRes = await locationApi.list();
            const itemsRes = await itemApi.list({});
            const tempRes = await itemApi.list({ temporary_only: true });

            setStats({
                locations: locationsRes.data.length,
                items: itemsRes.data.length,
                temporary: tempRes.data.length,
            });
            setTemporaryItems(tempRes.data.slice(0, 5));
        } catch (error) {
            console.error('Failed to load data:', error);
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

    return (
        <ScrollView
            style={globalStyles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.accentPrimary}
                />
            }
        >
            {/* Hero Header */}
            <View style={styles.heroHeader}>
                <View style={styles.heroGradient} />
                <Text style={styles.heroIcon}>📦</Text>
                <Text style={styles.heroTitle}>Storage Manager</Text>
                <Text style={styles.heroSubtitle}>Organize everything you own</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <StatCard icon="🏠" value={stats.locations} label="Locations" color={colors.accentPrimary} />
                <StatCard icon="📋" value={stats.items} label="Items" color={colors.success} />
                <StatCard icon="⚠️" value={stats.temporary} label="Temporary" color={colors.warning} />
            </View>

            {/* Quick Actions Grid */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.actionsGrid}>
                <ActionCard
                    icon="📷"
                    title="Scan QR"
                    subtitle="Find items fast"
                    onPress={() => navigation.navigate('Scanner')}
                    isPrimary
                />
                <ActionCard
                    icon="🔍"
                    title="Search"
                    subtitle="Find anything"
                    onPress={() => navigation.navigate('Search')}
                />
                <ActionCard
                    icon="👕"
                    title="Wardrobe"
                    subtitle="Manage clothes"
                    onPress={() => navigation.navigate('Wardrobe')}
                />
                <ActionCard
                    icon="🗂️"
                    title="Locations"
                    subtitle="Browse storage"
                    onPress={() => navigation.navigate('Locations')}
                />
            </View>

            {/* Temporary Items */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⚠️ Temporary Placements</Text>
                <Text style={styles.sectionBadge}>{stats.temporary}</Text>
            </View>
            {temporaryItems.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>✓</Text>
                    <Text style={styles.emptyText}>All items in their proper place!</Text>
                </View>
            ) : (
                <View style={styles.itemsList}>
                    {temporaryItems.map((item) => (
                        <ItemRow
                            key={item.id}
                            item={item}
                            onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
                        />
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: spacing.xxl,
    },
    // Hero Header
    heroHeader: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 1.5,
        paddingHorizontal: spacing.lg,
        position: 'relative',
        overflow: 'hidden',
    },
    heroGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.accentPrimary,
        opacity: 0.08,
    },
    heroIcon: {
        fontSize: 56,
        marginBottom: spacing.sm,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    heroSubtitle: {
        fontSize: typography.md,
        color: colors.textSecondary,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        marginTop: -spacing.lg,
        gap: spacing.sm,
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
    statIcon: {
        fontSize: 24,
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: typography.xxl,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: typography.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.lg,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    sectionBadge: {
        backgroundColor: colors.warning + '30',
        color: colors.warning,
        fontSize: typography.xs,
        fontWeight: '600',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    // Actions Grid
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    actionCard: {
        width: (width - spacing.md * 2 - spacing.sm) / 2 - 0.5,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionCardPrimary: {
        borderColor: colors.accentPrimary + '50',
        backgroundColor: colors.accentPrimary + '10',
    },
    actionIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    actionIconPrimary: {
        backgroundColor: colors.accentPrimary + '30',
    },
    actionIcon: {
        fontSize: 24,
    },
    actionTitle: {
        fontSize: typography.md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: typography.xs,
        color: colors.textMuted,
    },
    // Items List
    itemsList: {
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemName: {
        fontSize: typography.md,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    itemLocation: {
        fontSize: typography.xs,
        color: colors.textMuted,
    },
    tempBadge: {
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    tempBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.warning,
    },
    chevron: {
        fontSize: 24,
        color: colors.textMuted,
        marginLeft: spacing.xs,
    },
    // Empty State
    emptyState: {
        marginHorizontal: spacing.md,
        backgroundColor: colors.success + '10',
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.success + '30',
    },
    emptyIcon: {
        fontSize: 32,
        color: colors.success,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.sm,
        color: colors.success,
        fontWeight: '500',
    },
});
