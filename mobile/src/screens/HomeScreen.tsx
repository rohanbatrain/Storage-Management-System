import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, globalStyles } from '../styles/theme';
import { locationApi, itemApi } from '../services/api';

interface StatCardProps {
    icon: string;
    value: number;
    label: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => (
    <View style={styles.statCard}>
        <View style={globalStyles.row}>
            <Text style={{ fontSize: 20, marginRight: spacing.sm }}>{icon}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
        <Text style={globalStyles.textSecondary}>{label}</Text>
    </View>
);

interface ItemRowProps {
    item: any;
    onPress: () => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, onPress }) => (
    <TouchableOpacity style={globalStyles.listItem} onPress={onPress}>
        <Text style={{ fontSize: 20 }}>📦</Text>
        <View style={{ flex: 1 }}>
            <Text style={globalStyles.text}>{item.name}</Text>
            <Text style={globalStyles.textMuted}>
                {item.current_location?.name || 'Unknown location'}
            </Text>
        </View>
        {item.is_temporary_placement && (
            <View style={[globalStyles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Text style={[globalStyles.badgeText, { color: colors.warning }]}>Temporary</Text>
            </View>
        )}
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
                <Text style={globalStyles.title}>PSMS</Text>
                <Text style={globalStyles.textSecondary}>Personal Storage Manager</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
                <StatCard icon="📦" value={stats.locations} label="Locations" color={colors.accentPrimary} />
                <StatCard icon="📋" value={stats.items} label="Items" color={colors.success} />
                <StatCard icon="⚠️" value={stats.temporary} label="Temporary" color={colors.warning} />
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[globalStyles.btnPrimary, { flex: 1 }]}
                        onPress={() => navigation.navigate('Scanner')}
                    >
                        <Text style={{ fontSize: 18 }}>📷</Text>
                        <Text style={globalStyles.btnText}>Scan QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[globalStyles.btnSecondary, { flex: 1 }]}
                        onPress={() => navigation.navigate('Search')}
                    >
                        <Text style={{ fontSize: 18 }}>🔍</Text>
                        <Text style={globalStyles.btnText}>Search</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.actionsRow, { marginTop: spacing.sm }]}>
                    <TouchableOpacity
                        style={[globalStyles.btnSecondary, { flex: 1 }]}
                        onPress={() => navigation.navigate('Wardrobe')}
                    >
                        <Text style={{ fontSize: 18 }}>👕</Text>
                        <Text style={globalStyles.btnText}>Wardrobe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[globalStyles.btnSecondary, { flex: 1 }]}
                        onPress={() => navigation.navigate('Locations')}
                    >
                        <Text style={{ fontSize: 18 }}>🗂️</Text>
                        <Text style={globalStyles.btnText}>Locations</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Temporary Items */}
            <View style={styles.section}>
                <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>
                    ⚠️ Temporary Placements
                </Text>
                {temporaryItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={globalStyles.textMuted}>No items in temporary locations ✓</Text>
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
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
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
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    itemsList: {
        gap: spacing.sm,
    },
    emptyState: {
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
    },
    browseCard: {
        marginTop: spacing.md,
    },
});
