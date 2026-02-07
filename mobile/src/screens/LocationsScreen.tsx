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
import { locationApi } from '../services/api';

const { width } = Dimensions.get('window');

const kindIcons: { [key: string]: string } = {
    room: '🏠',
    furniture: '🪑',
    container: '📦',
    surface: '📋',
    portable: '🎒',
    laundry: '🧺',
};

const kindColors: { [key: string]: string } = {
    room: colors.accentPrimary,
    furniture: colors.warning,
    container: colors.success,
    surface: colors.info,
    portable: '#a855f7',
    laundry: '#ec4899',
};

interface LocationCardProps {
    location: any;
    onPress: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, onPress }) => {
    const color = kindColors[location.kind] || colors.accentPrimary;
    return (
        <TouchableOpacity style={styles.locationCard} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
                <Text style={styles.icon}>{kindIcons[location.kind] || '📁'}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationMeta}>
                    {location.item_count} items • {location.children_count} sub-locations
                </Text>
            </View>
            <View style={[styles.kindBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.kindBadgeText, { color }]}>{location.kind}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );
};

export default function LocationsScreen() {
    const navigation = useNavigation<any>();
    const [locations, setLocations] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadLocations = async () => {
        try {
            const response = await locationApi.list();
            setLocations(response.data);
        } catch (error) {
            console.error('Failed to load locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadLocations();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadLocations();
    }, []);

    // Group locations by kind
    const groupedLocations = locations.reduce((acc: any, loc: any) => {
        const kind = loc.kind || 'other';
        if (!acc[kind]) acc[kind] = [];
        acc[kind].push(loc);
        return acc;
    }, {});

    if (loading) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={styles.loadingIcon}>📦</Text>
                <Text style={globalStyles.textMuted}>Loading locations...</Text>
            </View>
        );
    }

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
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerIcon}>🗂️</Text>
                <Text style={styles.headerTitle}>Storage Locations</Text>
                <Text style={styles.headerSubtitle}>{locations.length} locations organized</Text>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsRow}>
                {Object.keys(kindIcons).map((kind) => {
                    const count = groupedLocations[kind]?.length || 0;
                    if (count === 0) return null;
                    return (
                        <View key={kind} style={styles.statPill}>
                            <Text style={styles.statIcon}>{kindIcons[kind]}</Text>
                            <Text style={styles.statCount}>{count}</Text>
                        </View>
                    );
                })}
            </View>

            {locations.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyTitle}>No Locations Yet</Text>
                    <Text style={styles.emptyText}>
                        Add your first storage location using the web app
                    </Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {locations.map((location) => (
                        <LocationCard
                            key={location.id}
                            location={location}
                            onPress={() => navigation.navigate('LocationDetail', { id: location.id })}
                        />
                    ))}
                </View>
            )}
        </ScrollView>
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
        backgroundColor: colors.accentPrimary + '08',
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
        fontSize: typography.sm,
        color: colors.textSecondary,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    statIcon: {
        fontSize: 14,
    },
    statCount: {
        fontSize: typography.sm,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    // List
    list: {
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 22,
    },
    locationName: {
        fontSize: typography.md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    locationMeta: {
        fontSize: typography.xs,
        color: colors.textMuted,
    },
    kindBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    kindBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    chevron: {
        fontSize: 24,
        color: colors.textMuted,
    },
    // Empty State
    emptyState: {
        marginHorizontal: spacing.md,
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
        fontSize: typography.lg,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.sm,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
