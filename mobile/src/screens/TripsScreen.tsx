import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, globalStyles } from '../styles/theme';
import { tripsApi } from '../services/api';
import FormModal from '../components/FormModal';

export default function TripsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        loadTrips();
    }, []);

    const loadTrips = async () => {
        try {
            const res = await tripsApi.list();
            setTrips(res.data);
        } catch (error) {
            console.error('Failed to load trips:', error);
            Alert.alert('Error', 'Failed to load trips');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreateTrip = async (data: any) => {
        try {
            setCreateLoading(true);
            await tripsApi.create({
                name: data.name,
                destination: data.destination,
                start_date: data.start_date,
                end_date: data.end_date,
                notes: data.notes || null,
            });
            setShowCreateModal(false);
            Alert.alert('Success', 'Trip created!');
            loadTrips();
        } catch (error: any) {
            console.error('Failed to create trip:', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to create trip');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleUnpackAll = async (tripId: string) => {
        Alert.alert(
            'Unpack Everything?',
            'Are you sure you want to unpack everything from this trip? It will automatically be marked inactive.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unpack All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await tripsApi.unpackAll(tripId);
                            loadTrips();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to unpack trip');
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading && trips.length === 0) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={styles.loadingEmoji}>✈️</Text>
                <Text style={globalStyles.textMuted}>Loading trips...</Text>
            </View>
        );
    }

    const activeTrips = trips.filter(t => t.is_active);
    const pastTrips = trips.filter(t => !t.is_active);

    return (
        <View style={globalStyles.container}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadTrips(); }}
                        tintColor={colors.accentPrimary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Trips & Packing</Text>
                        <Text style={styles.headerSubtitle}>
                            Organize physical items into temporary packing lists
                        </Text>
                    </View>
                </View>

                {/* Create Trip Button */}
                <TouchableOpacity
                    style={[globalStyles.btnPrimary, { marginBottom: spacing.xl }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Text style={globalStyles.btnText}>+ Plan a Trip</Text>
                </TouchableOpacity>

                {/* Active Trips */}
                <Text style={styles.sectionTitle}>✈️ Currently Planning ({activeTrips.length})</Text>

                {activeTrips.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyEmoji}>🧳</Text>
                        <Text style={styles.emptyText}>No active trips planned right now.</Text>
                    </View>
                ) : (
                    <View style={styles.tripList}>
                        {activeTrips.map(trip => (
                            <View key={trip.id} style={styles.tripCard}>
                                <View style={styles.tripHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.tripName}>{trip.name}</Text>
                                        <View style={styles.tripMetaRow}>
                                            <Text style={styles.tripMetaText}>📍 {trip.destination}</Text>
                                        </View>
                                        <View style={styles.tripMetaRow}>
                                            <Text style={styles.tripMetaText}>
                                                📅 {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.activeBadge}>
                                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                                    </View>
                                </View>

                                <View style={styles.packingSection}>
                                    <Text style={styles.packingTitle}>
                                        📦 Packed Items ({trip.items?.length || 0})
                                    </Text>
                                    {trip.items && trip.items.length > 0 ? (
                                        <View style={styles.packedItemsList}>
                                            {trip.items.map((item: any) => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={styles.packedItemBadge}
                                                    onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
                                                >
                                                    {item.image_url ? (
                                                        <Image source={{ uri: item.image_url }} style={styles.packedItemThumbnail} />
                                                    ) : (
                                                        <Text style={styles.packedItemEmoji}>📦</Text>
                                                    )}
                                                    <Text style={styles.packedItemName} numberOfLines={1}>{item.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={styles.noItemsText}>
                                            No items packed yet. Go to an item and select "Pack for Trip".
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.tripFooter}>
                                    <TouchableOpacity
                                        style={styles.unpackBtn}
                                        onPress={() => handleUnpackAll(trip.id)}
                                    >
                                        <Text style={styles.unpackBtnText}>📦 Unpack All & Finish Trip</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Past Trips */}
                {pastTrips.length > 0 && (
                    <View style={{ marginTop: spacing.xxl }}>
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                            📅 Past Trips ({pastTrips.length})
                        </Text>
                        <View style={styles.pastTripList}>
                            {pastTrips.map(trip => (
                                <View key={trip.id} style={styles.pastTripCard}>
                                    <View>
                                        <Text style={styles.pastTripName}>{trip.name}</Text>
                                        <Text style={styles.pastTripMeta}>{trip.destination}</Text>
                                        <Text style={styles.pastTripMeta}>{new Date(trip.end_date).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            <FormModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateTrip}
                title="New Trip"
                icon="✈️"
                loading={createLoading}
                submitLabel="Create Trip"
                fields={[
                    { key: 'name', label: 'Trip Name/Event (e.g. Hawaii Vacation)', required: true },
                    { key: 'destination', label: 'Destination', required: true },
                    { key: 'start_date', label: 'Start Date (YYYY-MM-DD)', required: true },
                    { key: 'end_date', label: 'End Date (YYYY-MM-DD)', required: true },
                    { key: 'notes', label: 'Notes (Optional)', multiline: true },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    loadingEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    content: {
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.sm,
    },
    emptyCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        padding: spacing.xxl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
        opacity: 0.5,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
    },
    tripList: {
        gap: spacing.lg,
    },
    tripCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    tripHeader: {
        flexDirection: 'row',
        padding: spacing.lg,
        backgroundColor: colors.bgTertiary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    tripName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    tripMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    tripMetaText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    activeBadge: {
        backgroundColor: '#6366f120',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    activeBadgeText: {
        color: '#6366f1',
        fontSize: 10,
        fontWeight: '800',
    },
    packingSection: {
        padding: spacing.lg,
        backgroundColor: colors.bgPrimary,
    },
    packingTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
        letterSpacing: 0.5,
    },
    packedItemsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    packedItemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        padding: 4,
        paddingRight: 8,
        maxWidth: 160,
    },
    packedItemThumbnail: {
        width: 20,
        height: 20,
        borderRadius: borderRadius.sm,
        marginRight: 6,
    },
    packedItemEmoji: {
        fontSize: 14,
        marginRight: 6,
        opacity: 0.5,
    },
    packedItemName: {
        fontSize: 12,
        color: colors.textPrimary,
        flex: 1,
    },
    noItemsText: {
        fontSize: 13,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    tripFooter: {
        padding: spacing.md,
        backgroundColor: colors.bgTertiary,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'flex-end',
    },
    unpackBtn: {
        backgroundColor: '#ef444415',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    unpackBtnText: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '600',
    },
    pastTripList: {
        gap: spacing.md,
    },
    pastTripCard: {
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 0.6,
    },
    pastTripName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    pastTripMeta: {
        fontSize: 12,
        color: colors.textMuted,
    },
});
