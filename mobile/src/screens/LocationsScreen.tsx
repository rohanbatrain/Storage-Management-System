import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { locationApi } from '../services/api';
import FormModal, { FAB, ConfirmDialog } from '../components/FormModal';

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
            <View style={styles.locationInfo}>
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
    const insets = useSafeAreaInsets();
    const [locations, setLocations] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

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

    const handleAddLocation = async (data: Record<string, any>) => {
        try {
            setActionLoading(true);
            await locationApi.create({
                name: data.name,
                kind: data.kind || 'room',
                description: data.description,
            });
            setAddModalVisible(false);
            Alert.alert('Success', 'Location created successfully');
            loadLocations();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create location');
        } finally {
            setActionLoading(false);
        }
    };

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
                            Tap the + button to add your first location
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

            {/* Add Location FAB */}
            <FAB icon="➕" onPress={() => setAddModalVisible(true)} color={colors.accentPrimary} />

            {/* Add Location Modal */}
            <FormModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSubmit={handleAddLocation}
                title="Add Location"
                icon="📍"
                loading={actionLoading}
                submitLabel="Create Location"
                fields={[
                    { key: 'name', label: 'Location Name', placeholder: 'e.g., "Bedroom", "Office"', required: true },
                    {
                        key: 'kind',
                        label: 'Location Type',
                        type: 'select',
                        required: true,
                        options: [
                            { value: 'room', label: 'Room', icon: '🏠' },
                            { value: 'furniture', label: 'Furniture', icon: '🪑' },
                            { value: 'container', label: 'Container', icon: '📦' },
                            { value: 'surface', label: 'Surface', icon: '📋' },
                            // Note: 'portable' requires a parent and cannot be a root location
                        ],
                    },
                    { key: 'description', label: 'Description (optional)', multiline: true },
                ]}
                initialValues={{ name: '', kind: 'room', description: '' }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 120,
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
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    // Stats
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    statIcon: {
        fontSize: 14,
    },
    statCount: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    // List
    list: {
        padding: spacing.lg,
        gap: spacing.sm,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    icon: {
        fontSize: 22,
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    locationMeta: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    kindBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        marginRight: spacing.sm,
    },
    kindBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
    // Kind Selector
    kindSelectorOverlay: {
        position: 'absolute',
        bottom: 180,
        left: 0,
        right: 0,
        backgroundColor: colors.bgSecondary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    kindSelectorLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    kindSelector: {
        flexDirection: 'row',
    },
    kindOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
        gap: spacing.xs,
    },
    kindOptionIcon: {
        fontSize: 16,
    },
    kindOptionText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
        textTransform: 'capitalize',
    },
});
