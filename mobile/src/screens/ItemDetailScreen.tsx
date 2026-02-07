import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { itemApi, locationApi } from '../services/api';
import FormModal, { ConfirmDialog } from '../components/FormModal';

export default function ItemDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { id } = route.params;

    const [item, setItem] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const loadData = async () => {
        try {
            const [itemRes, locRes] = await Promise.all([
                itemApi.get(id),
                locationApi.list(),
            ]);
            setItem(itemRes.data);
            setLocations(locRes.data);
        } catch (error) {
            console.error('Failed to load item:', error);
            Alert.alert('Error', 'Failed to load item details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleReturn = async () => {
        try {
            setActionLoading(true);
            await itemApi.return(id);
            Alert.alert('Success', 'Item returned to permanent location');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to return item');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = async (data: Record<string, string>) => {
        try {
            setActionLoading(true);
            await itemApi.update(id, {
                name: data.name,
                description: data.description,
                quantity: parseInt(data.quantity) || 1,
            });
            setEditModalVisible(false);
            Alert.alert('Success', 'Item updated successfully');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update item');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setActionLoading(true);
            await itemApi.delete(id);
            setDeleteDialogVisible(false);
            Alert.alert('Deleted', 'Item has been deleted');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to delete item');
            setActionLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading || !item) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={styles.loadingIcon}>📦</Text>
                <Text style={globalStyles.textMuted}>Loading item...</Text>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadData(); }}
                        tintColor={colors.accentPrimary}
                    />
                }
            >
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <View style={styles.iconWrapper}>
                            <Text style={styles.headerIcon}>📦</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemMeta}>Quantity: {item.quantity}</Text>
                        </View>
                        {item.is_temporary_placement && (
                            <View style={styles.tempBadge}>
                                <Text style={styles.tempBadgeText}>⏱️ Temp</Text>
                            </View>
                        )}
                    </View>
                    {item.description && (
                        <Text style={styles.description}>{item.description}</Text>
                    )}
                </View>

                {/* Location Cards */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📍 Location</Text>

                    <TouchableOpacity
                        style={styles.locationCard}
                        onPress={() => navigation.navigate('LocationDetail', { id: item.current_location_id })}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.locationIcon, { backgroundColor: colors.accentPrimary + '20' }]}>
                            <Text style={styles.locationEmoji}>📍</Text>
                        </View>
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationLabel}>Current Location</Text>
                            <Text style={styles.locationName}>
                                {item.current_location?.name || 'Unknown'}
                            </Text>
                        </View>
                        <Text style={styles.chevron}>→</Text>
                    </TouchableOpacity>

                    {item.permanent_location && item.permanent_location_id !== item.current_location_id && (
                        <TouchableOpacity
                            style={styles.locationCard}
                            onPress={() => navigation.navigate('LocationDetail', { id: item.permanent_location_id })}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.locationIcon, { backgroundColor: colors.success + '20' }]}>
                                <Text style={styles.locationEmoji}>🏠</Text>
                            </View>
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationLabel}>Permanent Home</Text>
                                <Text style={styles.locationName}>{item.permanent_location.name}</Text>
                            </View>
                            <Text style={styles.chevron}>→</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚡ Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.accentPrimary + '15' }]}
                            onPress={() => setEditModalVisible(true)}
                        >
                            <Text style={styles.actionIcon}>✏️</Text>
                            <Text style={[styles.actionLabel, { color: colors.accentPrimary }]}>Edit</Text>
                        </TouchableOpacity>

                        {item.is_temporary_placement && item.permanent_location_id && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
                                onPress={handleReturn}
                                disabled={actionLoading}
                            >
                                <Text style={styles.actionIcon}>↩️</Text>
                                <Text style={[styles.actionLabel, { color: colors.success }]}>Return</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.warning + '15' }]}
                            onPress={() => setMoveModalVisible(true)}
                        >
                            <Text style={styles.actionIcon}>📦</Text>
                            <Text style={[styles.actionLabel, { color: colors.warning }]}>Move</Text>
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

                {/* Item Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Details</Text>
                    <View style={styles.detailsCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Created</Text>
                            <Text style={styles.detailValue}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status</Text>
                            <Text style={[styles.detailValue, { color: item.is_temporary_placement ? colors.warning : colors.success }]}>
                                {item.is_temporary_placement ? 'Temporarily Placed' : 'In Place'}
                            </Text>
                        </View>
                        {item.aliases && item.aliases.length > 0 && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Aliases</Text>
                                <Text style={styles.detailValue}>{item.aliases.join(', ')}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <FormModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                onSubmit={handleEdit}
                title="Edit Item"
                icon="✏️"
                loading={actionLoading}
                submitLabel="Save Changes"
                fields={[
                    { key: 'name', label: 'Name', required: true },
                    { key: 'description', label: 'Description', multiline: true },
                    { key: 'quantity', label: 'Quantity', keyboardType: 'numeric' },
                ]}
                initialValues={{
                    name: item.name,
                    description: item.description || '',
                    quantity: String(item.quantity || 1),
                }}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                visible={deleteDialogVisible}
                onClose={() => setDeleteDialogVisible(false)}
                onConfirm={handleDelete}
                title="Delete Item?"
                message={`Are you sure you want to delete "${item.name}"? This action cannot be undone.`}
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
        backgroundColor: colors.accentPrimary + '20',
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
    itemName: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    itemMeta: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 2,
    },
    tempBadge: {
        backgroundColor: colors.warning + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    tempBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.warning,
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
    // Location Cards
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    locationIcon: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    locationEmoji: {
        fontSize: 20,
    },
    locationInfo: {
        flex: 1,
    },
    locationLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 2,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    chevron: {
        fontSize: 18,
        color: colors.textMuted,
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
    // Details Card
    detailsCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    detailLabel: {
        fontSize: 14,
        color: colors.textMuted,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
});
