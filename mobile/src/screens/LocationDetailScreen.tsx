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
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { locationApi, itemApi, qrApi } from '../services/api';
import FormModal, { ConfirmDialog, FAB } from '../components/FormModal';

const kindIcons: { [key: string]: string } = {
    room: '🏠',
    furniture: '🪑',
    container: '📦',
    surface: '📋',
    portable: '🎒',
    laundry: '🧺',
    laundry_worn: '🧲',
    laundry_dirty: '🧲',
};

const kindColors: { [key: string]: string } = {
    room: colors.accentPrimary,
    furniture: colors.warning,
    container: colors.success,
    surface: colors.info,
    portable: '#a855f7',
    laundry: '#ec4899',
    laundry_worn: colors.success,
    laundry_dirty: colors.error,
};

// Valid child kinds based on parent kind (matching backend validation)
const VALID_CHILD_KINDS: { [key: string]: string[] } = {
    room: ['furniture', 'container', 'surface', 'portable'],
    furniture: ['container', 'surface'],
    container: ['container'],
    surface: ['container', 'portable'],
    portable: ['container'],
    laundry_worn: [],
    laundry_dirty: [],
};

const kindDetails: { [key: string]: { label: string; description: string } } = {
    furniture: { label: 'Furniture', description: 'Wardrobe, Desk, Shelf' },
    container: { label: 'Container', description: 'Box, Drawer, Bin' },
    surface: { label: 'Surface', description: 'Shelf, Counter' },
    portable: { label: 'Portable', description: 'Bag, Suitcase' },
};

export default function LocationDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { id } = route.params;

    const [location, setLocation] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showQR, setShowQR] = useState(false);

    // Modal states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [addItemModalVisible, setAddItemModalVisible] = useState(false);
    const [addSubLocationModalVisible, setAddSubLocationModalVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const loadData = async () => {
        try {
            const locRes = await locationApi.get(id);
            setLocation(locRes.data);

            const itemsRes = await itemApi.list({ location_id: id });
            setItems(itemsRes.data);
        } catch (error) {
            console.error('Failed to load location:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [id]);

    const handleEdit = async (data: Record<string, string>) => {
        try {
            setActionLoading(true);
            await locationApi.update(id, {
                name: data.name,
                description: data.description,
            });
            setEditModalVisible(false);
            Alert.alert('Success', 'Location updated successfully');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update location');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddItem = async (data: Record<string, any>) => {
        try {
            setActionLoading(true);
            await itemApi.create({
                name: data.name,
                description: data.description,
                quantity: parseInt(data.quantity) || 1,
                current_location_id: id,
                is_temporary_placement: !!data.isTemporary,
            });
            setAddItemModalVisible(false);
            Alert.alert('Success', 'Item added successfully');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to add item');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddSubLocation = async (data: Record<string, any>) => {
        try {
            setActionLoading(true);
            await locationApi.create({
                name: data.name,
                kind: data.kind,
                parent_id: id,
            });
            setAddSubLocationModalVisible(false);
            Alert.alert('Success', 'Sub-location created successfully');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create sub-location');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setActionLoading(true);
            await locationApi.delete(id);
            setDeleteDialogVisible(false);
            Alert.alert('Deleted', 'Location has been deleted');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to delete location');
            setActionLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading || !location) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={styles.loadingIcon}>📍</Text>
                <Text style={globalStyles.textMuted}>Loading location...</Text>
            </View>
        );
    }

    const color = kindColors[location.kind] || colors.accentPrimary;

    return (
        <View style={globalStyles.container}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accentPrimary}
                    />
                }
            >
                {/* Header Card */}
                <View style={[styles.headerCard, { borderTopColor: color, borderTopWidth: 3 }]}>
                    <View style={styles.headerTop}>
                        <View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
                            <Text style={styles.headerIcon}>{kindIcons[location.kind] || '📁'}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.locationName}>{location.name}</Text>
                            <View style={styles.statsRow}>
                                <Text style={styles.statText}>{items.length} items</Text>
                                <Text style={styles.statDot}>•</Text>
                                <Text style={styles.statText}>{location.children_count || 0} sub-locations</Text>
                            </View>
                        </View>
                        <View style={[styles.kindBadge, { backgroundColor: color + '20' }]}>
                            <Text style={[styles.kindBadgeText, { color }]}>{location.kind}</Text>
                        </View>
                    </View>
                    {location.description && (
                        <Text style={styles.description}>{location.description}</Text>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.accentPrimary + '15' }]}
                            onPress={() => setShowQR(!showQR)}
                        >
                            <Text style={styles.actionIcon}>📱</Text>
                            <Text style={[styles.actionLabel, { color: colors.accentPrimary }]}>
                                {showQR ? 'Hide QR' : 'Show QR'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
                            onPress={() => setAddItemModalVisible(true)}
                        >
                            <Text style={styles.actionIcon}>➕</Text>
                            <Text style={[styles.actionLabel, { color: colors.success }]}>Add Item</Text>
                        </TouchableOpacity>

                        {(VALID_CHILD_KINDS[location.kind]?.length > 0) && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#8b5cf6' + '15' }]}
                                onPress={() => setAddSubLocationModalVisible(true)}
                            >
                                <Text style={styles.actionIcon}>📁</Text>
                                <Text style={[styles.actionLabel, { color: '#8b5cf6' }]}>Add Sub</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.warning + '15' }]}
                            onPress={() => setEditModalVisible(true)}
                        >
                            <Text style={styles.actionIcon}>✏️</Text>
                            <Text style={[styles.actionLabel, { color: colors.warning }]}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                            onPress={() => setDeleteDialogVisible(true)}
                        >
                            <Text style={styles.actionIcon}>🗑️</Text>
                            <Text style={[styles.actionLabel, { color: colors.error }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* QR Code */}
                {showQR && (
                    <View style={styles.qrContainer}>
                        <Image
                            source={{ uri: qrApi.getQrUrl(location.qr_code_id, 200) }}
                            style={styles.qrCode}
                        />
                        <Text style={styles.qrLabel}>Scan to navigate here</Text>
                    </View>
                )}

                {/* Items in this location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📦 Items Here</Text>
                    {items.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyText}>No items in this location</Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => setAddItemModalVisible(true)}
                            >
                                <Text style={styles.emptyButtonText}>+ Add First Item</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.itemsList}>
                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.itemCard}
                                    onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.itemIcon}>
                                        <Text style={styles.itemEmoji}>📦</Text>
                                    </View>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                                    </View>
                                    {item.is_temporary_placement && (
                                        <View style={styles.tempBadge}>
                                            <Text style={styles.tempBadgeText}>Temp</Text>
                                        </View>
                                    )}
                                    <Text style={styles.chevron}>→</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Sub-locations */}
                {location.children && location.children.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📂 Sub-Locations</Text>
                        <View style={styles.itemsList}>
                            {location.children.map((child: any) => (
                                <TouchableOpacity
                                    key={child.id}
                                    style={styles.itemCard}
                                    onPress={() => navigation.push('LocationDetail', { id: child.id })}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.itemIcon, { backgroundColor: (kindColors[child.kind] || colors.accentPrimary) + '20' }]}>
                                        <Text style={styles.itemEmoji}>{kindIcons[child.kind] || '📁'}</Text>
                                    </View>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{child.name}</Text>
                                        <Text style={styles.itemMeta}>{child.kind}</Text>
                                    </View>
                                    <Text style={styles.chevron}>→</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Edit Modal */}
            <FormModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                onSubmit={handleEdit}
                title="Edit Location"
                icon="✏️"
                loading={actionLoading}
                submitLabel="Save Changes"
                accentColor={color}
                fields={[
                    { key: 'name', label: 'Location Name', required: true },
                    { key: 'description', label: 'Description', multiline: true },
                ]}
                initialValues={{
                    name: location.name,
                    description: location.description || '',
                }}
            />

            {/* Add Item Modal */}
            <FormModal
                visible={addItemModalVisible}
                onClose={() => setAddItemModalVisible(false)}
                onSubmit={handleAddItem}
                title="Add Item"
                icon="📦"
                loading={actionLoading}
                submitLabel="Add Item"
                accentColor={colors.success}
                fields={[
                    { key: 'name', label: 'Item Name', placeholder: 'e.g., "Winter Jacket, Passport"', required: true },
                    { key: 'quantity', label: 'Quantity', keyboardType: 'numeric' },
                    { key: 'isTemporary', label: 'This is a temporary placement', type: 'checkbox' },
                ]}
                initialValues={{ name: '', quantity: '1', isTemporary: false }}
            />

            {/* Add Sub-Location Modal */}
            <FormModal
                visible={addSubLocationModalVisible}
                onClose={() => setAddSubLocationModalVisible(false)}
                onSubmit={handleAddSubLocation}
                title="Add Sub-Location"
                icon="📁"
                loading={actionLoading}
                submitLabel="Create"
                accentColor="#8b5cf6"
                fields={[
                    { key: 'name', label: 'Name', placeholder: 'e.g., "Top Drawer", "Left Shelf"', required: true },
                    {
                        key: 'kind',
                        label: 'Type',
                        type: 'select',
                        options: (VALID_CHILD_KINDS[location.kind] || []).map(k => ({
                            value: k,
                            label: kindDetails[k]?.label || k,
                            icon: kindIcons[k] || '📁',
                        })),
                    },
                ]}
                initialValues={{ name: '', kind: (VALID_CHILD_KINDS[location.kind] || ['container'])[0] }}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                visible={deleteDialogVisible}
                onClose={() => setDeleteDialogVisible(false)}
                onConfirm={handleDelete}
                title="Delete Location?"
                message={`Are you sure you want to delete "${location.name}"? All items and sub-locations will also be affected.`}
                loading={actionLoading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: spacing.lg,
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
    // Header Card
    headerCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    headerIcon: {
        fontSize: 28,
    },
    headerInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    statDot: {
        fontSize: 13,
        color: colors.textMuted,
        marginHorizontal: spacing.xs,
    },
    kindBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    kindBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: spacing.md,
        lineHeight: 20,
    },
    // Sections
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    // Actions Grid
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    actionButton: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    actionIcon: {
        fontSize: 18,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    // QR Code
    qrContainer: {
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    qrCode: {
        width: 180,
        height: 180,
        borderRadius: borderRadius.md,
        backgroundColor: 'white',
    },
    qrLabel: {
        marginTop: spacing.md,
        fontSize: 13,
        color: colors.textMuted,
    },
    // Items List
    itemsList: {
        gap: spacing.sm,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: colors.accentPrimary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    itemEmoji: {
        fontSize: 18,
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
    tempBadge: {
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginRight: spacing.sm,
    },
    tempBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.warning,
    },
    chevron: {
        fontSize: 16,
        color: colors.textMuted,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    emptyButton: {
        backgroundColor: colors.success + '20',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.success,
    },
});
