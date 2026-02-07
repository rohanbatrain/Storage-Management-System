import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { locationApi, itemApi, qrApi } from '../services/api';

const kindIcons: { [key: string]: string } = {
    room: '🏠',
    furniture: '🪑',
    container: '📦',
    surface: '📋',
    portable: '🎒',
};

export default function LocationDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { id } = route.params;

    const [location, setLocation] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showQR, setShowQR] = useState(false);

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

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading || !location) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={globalStyles.textMuted}>Loading...</Text>
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
            {/* Header */}
            <View style={styles.header}>
                <View style={globalStyles.row}>
                    <Text style={{ fontSize: 32, marginRight: spacing.md }}>
                        {kindIcons[location.kind] || '📁'}
                    </Text>
                    <View style={{ flex: 1 }}>
                        <Text style={globalStyles.title}>{location.name}</Text>
                        <Text style={globalStyles.textSecondary}>
                            {location.item_count} items • {location.children_count || 0} sub-locations
                        </Text>
                    </View>
                </View>
            </View>

            {/* QR Code Button */}
            <TouchableOpacity
                style={[globalStyles.btnPrimary, { marginBottom: spacing.xl }]}
                onPress={() => setShowQR(!showQR)}
            >
                <Text style={{ fontSize: 18 }}>📱</Text>
                <Text style={globalStyles.btnText}>
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                </Text>
            </TouchableOpacity>

            {/* QR Code Display */}
            {showQR && (
                <View style={[globalStyles.card, styles.qrCard]}>
                    <Image
                        source={{ uri: qrApi.getQrUrl(id, 200) }}
                        style={styles.qrImage}
                        resizeMode="contain"
                    />
                    <Text style={globalStyles.textMuted}>
                        Scan this code to access this location
                    </Text>
                </View>
            )}

            {/* Breadcrumb */}
            {location.path && location.path.length > 1 && (
                <View style={styles.breadcrumb}>
                    {location.path.map((segment: any, index: number) => (
                        <TouchableOpacity
                            key={segment.id}
                            onPress={() => {
                                if (index < location.path.length - 1) {
                                    navigation.navigate('LocationDetail', { id: segment.id });
                                }
                            }}
                        >
                            <Text
                                style={
                                    index === location.path.length - 1
                                        ? globalStyles.text
                                        : globalStyles.textMuted
                                }
                            >
                                {segment.name}
                                {index < location.path.length - 1 ? ' → ' : ''}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Sub-Locations */}
            {location.children && location.children.length > 0 && (
                <View style={styles.section}>
                    <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>
                        Sub-Locations
                    </Text>
                    <View style={styles.list}>
                        {location.children.map((child: any) => (
                            <TouchableOpacity
                                key={child.id}
                                style={globalStyles.listItem}
                                onPress={() => navigation.push('LocationDetail', { id: child.id })}
                            >
                                <Text style={{ fontSize: 20 }}>{kindIcons[child.kind] || '📁'}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={globalStyles.text}>{child.name}</Text>
                                    <Text style={globalStyles.textMuted}>
                                        {child.item_count} items
                                    </Text>
                                </View>
                                <Text style={{ color: colors.textMuted }}>→</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Items */}
            <View style={styles.section}>
                <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>
                    Items ({items.length})
                </Text>
                {items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={globalStyles.textMuted}>No items in this location</Text>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {items.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={globalStyles.listItem}
                                onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
                            >
                                <Text style={{ fontSize: 20 }}>📦</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={globalStyles.text}>{item.name}</Text>
                                    <Text style={globalStyles.textMuted}>Qty: {item.quantity}</Text>
                                </View>
                                {item.is_temporary_placement && (
                                    <View
                                        style={[
                                            globalStyles.badge,
                                            { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
                                        ]}
                                    >
                                        <Text style={[globalStyles.badgeText, { color: colors.warning }]}>
                                            Temp
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
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
    header: {
        marginBottom: spacing.lg,
    },
    qrCard: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    qrImage: {
        width: 200,
        height: 200,
        backgroundColor: 'white',
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    breadcrumb: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    list: {
        gap: spacing.sm,
    },
    emptyState: {
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
    },
});
