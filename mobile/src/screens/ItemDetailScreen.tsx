import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Modal,
    Switch,
    Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { itemApi, locationApi, qrApi } from '../services/api';
import FormModal, { ConfirmDialog, LocationPicker } from '../components/FormModal';

export default function ItemDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { id } = route.params;

    const [item, setItem] = useState<any>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [lendModalVisible, setLendModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);

    // Lend state
    const [lendBorrower, setLendBorrower] = useState('');
    const [lendDueDate, setLendDueDate] = useState('');
    const [lendNotes, setLendNotes] = useState('');

    const loadData = async () => {
        try {
            const [itemRes, locRes, histRes] = await Promise.all([
                itemApi.get(id),
                locationApi.getTree(),
                itemApi.getHistory(id).catch(() => ({ data: [] })),
            ]);
            setItem(itemRes.data);
            setLocations(locRes.data);
            setHistory(histRes.data || []);
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

    // Move Item Modal Component
    const [moveSelectedLocation, setMoveSelectedLocation] = useState<string>('');
    const [moveIsTemporary, setMoveIsTemporary] = useState(false);
    const [locationPickerVisible, setLocationPickerVisible] = useState(false);
    const [selectedLocationName, setSelectedLocationName] = useState('');

    const handleMove = async () => {
        if (!moveSelectedLocation) {
            Alert.alert('Error', 'Please select a location');
            return;
        }
        try {
            setActionLoading(true);
            await itemApi.move(id, {
                to_location_id: moveSelectedLocation,
                is_temporary: moveIsTemporary,
            });
            setMoveModalVisible(false);
            Alert.alert('Success', 'Item moved successfully');
            loadData();
            // Reset move state
            setMoveSelectedLocation('');
            setSelectedLocationName('');
            setMoveIsTemporary(false);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to move item');
        } finally {
            setActionLoading(false);
        }
    };

    // Lend item handler
    const handleLend = async () => {
        if (!lendBorrower.trim()) {
            Alert.alert('Error', 'Please enter borrower name');
            return;
        }
        try {
            setActionLoading(true);
            await itemApi.lend(id, lendBorrower.trim(), lendDueDate || undefined, lendNotes || undefined);
            setLendModalVisible(false);
            Alert.alert('Success', `Item lent to ${lendBorrower}`);
            loadData();
            // Reset lend state
            setLendBorrower('');
            setLendDueDate('');
            setLendNotes('');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to lend item');
        } finally {
            setActionLoading(false);
        }
    };

    // Return from loan handler
    const handleReturnLoan = async () => {
        try {
            setActionLoading(true);
            await itemApi.returnLoan(id);
            Alert.alert('Success', 'Item returned from loan');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to return item');
        } finally {
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

                {/* Loan Status Badge */}
                {item.is_lent && (
                    <View style={styles.loanBanner}>
                        <Text style={styles.loanBannerIcon}>🤝</Text>
                        <View style={styles.loanBannerText}>
                            <Text style={styles.loanBannerTitle}>Lent to {item.lent_to}</Text>
                            {item.due_date && (
                                <Text style={styles.loanBannerDue}>
                                    Due: {new Date(item.due_date).toLocaleDateString()}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.loanReturnBtn}
                            onPress={handleReturnLoan}
                            disabled={actionLoading}
                        >
                            <Text style={styles.loanReturnBtnText}>Return</Text>
                        </TouchableOpacity>
                    </View>
                )}

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

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.info + '15' }]}
                            onPress={() => setShowQR(!showQR)}
                        >
                            <Text style={styles.actionIcon}>📱</Text>
                            <Text style={[styles.actionLabel, { color: colors.info }]}>
                                {showQR ? 'Hide QR' : 'Show QR'}
                            </Text>
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

                        {!item.is_lent && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#8B5CF6' + '15' }]}
                                onPress={() => setLendModalVisible(true)}
                            >
                                <Text style={styles.actionIcon}>🤝</Text>
                                <Text style={[styles.actionLabel, { color: '#8B5CF6' }]}>Lend</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
                            onPress={() => setDeleteDialogVisible(true)}
                        >
                            <Text style={styles.actionIcon}>🗑️</Text>
                            <Text style={[styles.actionLabel, { color: colors.error }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* QR Code(s) */}
                {showQR && (
                    <View style={styles.qrContainer}>
                        {item.quantity > 1 ? (
                            // Multiple QR codes for items with qty > 1
                            <>
                                <Text style={styles.qrSectionTitle}>
                                    📱 {item.quantity} QR Codes (one per unit)
                                </Text>
                                <View style={styles.qrGrid}>
                                    {Array.from({ length: Math.min(item.quantity, 10) }, (_, i) => (
                                        <View key={i} style={styles.qrGridItem}>
                                            <Image
                                                source={{ uri: qrApi.getItemSequenceQrUrl(id, i + 1, item.quantity, 150) }}
                                                style={styles.qrCodeSmall}
                                            />
                                            <Text style={styles.qrName} numberOfLines={1}>
                                                {item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name}
                                            </Text>
                                            <Text style={styles.qrSequence}>{i + 1}/{item.quantity}</Text>
                                        </View>
                                    ))}
                                </View>
                                {item.quantity > 10 && (
                                    <Text style={styles.qrHint}>Showing first 10 of {item.quantity} QR codes</Text>
                                )}
                            </>
                        ) : (
                            // Single QR for qty = 1
                            <>
                                <Image
                                    source={{ uri: qrApi.getItemQrUrl(id, 200) }}
                                    style={styles.qrCode}
                                />
                                <Text style={styles.qrName} numberOfLines={1}>
                                    {item.name.length > 32 ? item.name.slice(0, 32) + '...' : item.name}
                                </Text>
                                <Text style={styles.qrLabel}>Scan to find this item</Text>
                            </>
                        )}
                        <Text style={styles.qrHint}>Print and attach to item for easy tracking</Text>
                    </View>
                )}

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

                {/* Movement History */}
                {history.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📜 Movement History</Text>
                        <View style={styles.detailsCard}>
                            {history.slice(0, 5).map((entry: any, idx: number) => (
                                <View key={entry.id || idx} style={styles.historyItem}>
                                    <Text style={styles.historyAction}>
                                        {entry.action === 'move' ? '📦 Moved' :
                                            entry.action === 'return' ? '↩️ Returned' :
                                                entry.action === 'create' ? '➕ Created' : entry.action}
                                    </Text>
                                    <Text style={styles.historyTime}>
                                        {new Date(entry.moved_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            ))}
                            {history.length > 5 && (
                                <Text style={styles.historyMore}>+{history.length - 5} more entries</Text>
                            )}
                        </View>
                    </View>
                )}
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

            {/* Move Item Modal */}
            <Modal
                visible={moveModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMoveModalVisible(false)}
            >
                <View style={moveStyles.overlay}>
                    <View style={[moveStyles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <View style={moveStyles.header}>
                            <View style={moveStyles.iconWrapper}>
                                <Text style={moveStyles.icon}>📦</Text>
                            </View>
                            <Text style={moveStyles.title}>Move Item</Text>
                            <TouchableOpacity
                                style={moveStyles.closeButton}
                                onPress={() => setMoveModalVisible(false)}
                            >
                                <Text style={moveStyles.closeIcon}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={moveStyles.content}>
                            <Text style={moveStyles.label}>Move "{item.name}" to:</Text>
                            <TouchableOpacity
                                style={moveStyles.locationPicker}
                                onPress={() => setLocationPickerVisible(true)}
                            >
                                <Text style={selectedLocationName ? moveStyles.locationText : moveStyles.placeholderText}>
                                    {selectedLocationName || 'Select a location...'}
                                </Text>
                                <Text style={moveStyles.chevron}>›</Text>
                            </TouchableOpacity>

                            <View style={moveStyles.checkboxRow}>
                                <Switch
                                    value={moveIsTemporary}
                                    onValueChange={setMoveIsTemporary}
                                    trackColor={{ false: colors.bgTertiary, true: colors.warning + '60' }}
                                    thumbColor={moveIsTemporary ? colors.warning : colors.textMuted}
                                />
                                <Text style={moveStyles.checkboxLabel}>This is a temporary placement</Text>
                            </View>
                        </View>

                        <View style={moveStyles.actions}>
                            <TouchableOpacity
                                style={moveStyles.cancelButton}
                                onPress={() => setMoveModalVisible(false)}
                            >
                                <Text style={moveStyles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    moveStyles.submitButton,
                                    !moveSelectedLocation && moveStyles.submitButtonDisabled
                                ]}
                                onPress={handleMove}
                                disabled={!moveSelectedLocation || actionLoading}
                            >
                                <Text style={moveStyles.submitText}>
                                    {actionLoading ? 'Moving...' : 'Move Item'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Location Picker */}
            <LocationPicker
                visible={locationPickerVisible}
                onClose={() => setLocationPickerVisible(false)}
                onSelect={(locId, locName) => {
                    setMoveSelectedLocation(locId);
                    setSelectedLocationName(locName);
                }}
                locations={locations}
                title="Select Destination"
            />

            {/* Lend Modal */}
            <Modal
                visible={lendModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLendModalVisible(false)}
            >
                <View style={moveStyles.overlay}>
                    <View style={moveStyles.modal}>
                        <Text style={moveStyles.title}>🤝 Lend Item</Text>
                        <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>
                            Enter the name of the person borrowing this item
                        </Text>

                        <View style={{ marginBottom: spacing.md }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Borrower Name *</Text>
                            <View style={{
                                backgroundColor: colors.bgTertiary,
                                borderRadius: borderRadius.md,
                                padding: spacing.md,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}>
                                <Text
                                    style={{ color: lendBorrower ? colors.textPrimary : colors.textMuted }}
                                    onPress={() => {
                                        Alert.prompt(
                                            'Borrower Name',
                                            'Who are you lending this to?',
                                            (text) => setLendBorrower(text || ''),
                                            'plain-text',
                                            lendBorrower
                                        );
                                    }}
                                >
                                    {lendBorrower || 'Tap to enter name...'}
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingTop: 0 }}>
                            <TouchableOpacity
                                style={moveStyles.cancelButton}
                                onPress={() => {
                                    setLendModalVisible(false);
                                    setLendBorrower('');
                                }}
                            >
                                <Text style={moveStyles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    moveStyles.submitButton,
                                    !lendBorrower && moveStyles.submitButtonDisabled
                                ]}
                                onPress={handleLend}
                                disabled={!lendBorrower || actionLoading}
                            >
                                <Text style={moveStyles.submitText}>
                                    {actionLoading ? 'Lending...' : 'Lend Item'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const moveStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: colors.bgSecondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.warning + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    icon: {
        fontSize: 24,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 14,
        color: colors.textMuted,
    },
    content: {
        padding: spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    locationPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    locationText: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    placeholderText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    checkboxLabel: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    actions: {
        flexDirection: 'row',
        padding: spacing.lg,
        paddingTop: 0,
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    submitButton: {
        flex: 2,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.warning,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
});

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
    // History styles
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    historyAction: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    historyTime: {
        fontSize: 12,
        color: colors.textMuted,
    },
    historyMore: {
        fontSize: 12,
        color: colors.accentPrimary,
        textAlign: 'center',
        paddingTop: spacing.sm,
    },
    // QR styles
    qrContainer: {
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    qrCode: {
        width: 200,
        height: 200,
        borderRadius: borderRadius.md,
        backgroundColor: '#fff',
    },
    qrLabel: {
        marginTop: spacing.md,
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    qrHint: {
        marginTop: spacing.xs,
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    qrSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    qrGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.md,
    },
    qrGridItem: {
        alignItems: 'center',
        padding: spacing.sm,
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        width: 130,
    },
    qrCodeSmall: {
        width: 100,
        height: 100,
        borderRadius: borderRadius.sm,
        backgroundColor: '#fff',
    },
    qrName: {
        marginTop: spacing.xs,
        fontSize: 11,
        fontWeight: '500',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    qrSequence: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.accentPrimary,
    },
    // Loan banner styles
    loanBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B5CF6' + '20',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: '#8B5CF6' + '40',
    },
    loanBannerIcon: {
        fontSize: 28,
        marginRight: spacing.md,
    },
    loanBannerText: {
        flex: 1,
    },
    loanBannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    loanBannerDue: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    loanReturnBtn: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    loanReturnBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});
