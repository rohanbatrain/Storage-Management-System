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
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { locationApi } from '../services/api';

const kindIcons: { [key: string]: string } = {
    room: '🏠',
    furniture: '🪑',
    container: '📦',
    surface: '📋',
    portable: '🎒',
};

interface LocationItemProps {
    location: any;
    onPress: () => void;
}

const LocationItem: React.FC<LocationItemProps> = ({ location, onPress }) => (
    <TouchableOpacity style={globalStyles.listItem} onPress={onPress}>
        <Text style={{ fontSize: 24 }}>{kindIcons[location.kind] || '📁'}</Text>
        <View style={{ flex: 1 }}>
            <Text style={globalStyles.text}>{location.name}</Text>
            <Text style={globalStyles.textMuted}>
                {location.item_count} items • {location.children_count} sub-locations
            </Text>
        </View>
        <Text style={{ color: colors.textMuted }}>→</Text>
    </TouchableOpacity>
);

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

    if (loading) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={globalStyles.textMuted}>Loading locations...</Text>
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
            <Text style={[globalStyles.title, { marginBottom: spacing.lg }]}>
                Storage Locations
            </Text>

            {locations.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📦</Text>
                    <Text style={globalStyles.subtitle}>No Locations Yet</Text>
                    <Text style={[globalStyles.textMuted, { textAlign: 'center' }]}>
                        Add your first storage location using the web app
                    </Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {locations.map((location) => (
                        <LocationItem
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
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        gap: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xxl,
    },
});
