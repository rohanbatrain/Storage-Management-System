import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { itemApi } from '../services/api';

const actionColors: { [key: string]: string } = {
    placed: colors.success,
    moved: colors.info,
    returned: colors.accentPrimary,
};

export default function ItemDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { id } = route.params;

    const [item, setItem] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const itemRes = await itemApi.get(id);
            setItem(itemRes.data);

            const historyRes = await itemApi.getHistory(id);
            setHistory(historyRes.data);
        } catch (error) {
            console.error('Failed to load item:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReturn = async () => {
        try {
            await itemApi.return(id);
            Alert.alert('Success', 'Item returned to permanent location');
            loadData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to return item');
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading || !item) {
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
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={globalStyles.row}>
                    <Text style={{ fontSize: 32, marginRight: spacing.md }}>📦</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={globalStyles.title}>{item.name}</Text>
                        <Text style={globalStyles.textSecondary}>Quantity: {item.quantity}</Text>
                    </View>
                    {item.is_temporary_placement && (
                        <View
                            style={[
                                globalStyles.badge,
                                { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
                            ]}
                        >
                            <Text style={[globalStyles.badgeText, { color: colors.warning }]}>
                                Temporary
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Locations */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={[globalStyles.card, { marginBottom: spacing.md }]}
                    onPress={() =>
                        navigation.navigate('LocationDetail', { id: item.current_location_id })
                    }
                >
                    <View style={globalStyles.row}>
                        <Text style={{ fontSize: 18, marginRight: spacing.sm }}>📍</Text>
                        <Text style={globalStyles.textSecondary}>Current Location</Text>
                    </View>
                    <Text style={[globalStyles.subtitle, { marginTop: spacing.sm }]}>
                        {item.current_location?.name || 'Unknown'}
                    </Text>
                    {item.location_path && (
                        <Text style={globalStyles.textMuted}>
                            {item.location_path.map((p: any) => p.name).join(' → ')}
                        </Text>
                    )}
                </TouchableOpacity>

                {item.permanent_location && (
                    <TouchableOpacity
                        style={globalStyles.card}
                        onPress={() =>
                            navigation.navigate('LocationDetail', { id: item.permanent_location_id })
                        }
                    >
                        <View style={globalStyles.row}>
                            <Text style={{ fontSize: 18, marginRight: spacing.sm }}>🏠</Text>
                            <Text style={globalStyles.textSecondary}>Permanent Home</Text>
                        </View>
                        <Text style={[globalStyles.subtitle, { marginTop: spacing.sm }]}>
                            {item.permanent_location.name}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Actions */}
            {item.is_temporary_placement && item.permanent_location_id && (
                <TouchableOpacity
                    style={[globalStyles.btnPrimary, { marginBottom: spacing.xl }]}
                    onPress={handleReturn}
                >
                    <Text style={{ fontSize: 18 }}>↩️</Text>
                    <Text style={globalStyles.btnText}>Return to Permanent Location</Text>
                </TouchableOpacity>
            )}

            {/* History */}
            <View style={styles.section}>
                <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>
                    📜 Movement History
                </Text>
                {history.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={globalStyles.textMuted}>No movement history</Text>
                    </View>
                ) : (
                    <View style={styles.historyList}>
                        {history.map((record) => (
                            <View key={record.id} style={styles.historyItem}>
                                <View
                                    style={[
                                        styles.historyDot,
                                        { backgroundColor: actionColors[record.action] || colors.textMuted },
                                    ]}
                                />
                                <View style={{ flex: 1 }}>
                                    <View style={globalStyles.row}>
                                        <Text
                                            style={[
                                                globalStyles.text,
                                                { color: actionColors[record.action], textTransform: 'capitalize' },
                                            ]}
                                        >
                                            {record.action}
                                        </Text>
                                        <Text style={[globalStyles.textMuted, { marginLeft: spacing.sm }]}>
                                            {new Date(record.moved_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text style={globalStyles.textSecondary}>
                                        {record.from_location
                                            ? `${record.from_location.name} → ${record.to_location.name}`
                                            : `Initial: ${record.to_location.name}`}
                                    </Text>
                                </View>
                            </View>
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
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    emptyState: {
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        alignItems: 'center',
    },
    historyList: {
        gap: spacing.md,
    },
    historyItem: {
        flexDirection: 'row',
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        gap: spacing.md,
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
});
