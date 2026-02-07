import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { searchApi } from '../services/api';

export default function SearchScreen() {
    const navigation = useNavigation<any>();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>({ items: [], locations: [], total_count: 0 });
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const response = await searchApi.search(query);
            setResults(response.data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={globalStyles.container}>
            {/* Search Header */}
            <View style={styles.searchHeader}>
                <View style={styles.searchInputContainer}>
                    <Text style={{ fontSize: 18 }}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search items or locations..."
                        placeholderTextColor={colors.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoFocus
                    />
                </View>
                <TouchableOpacity style={globalStyles.btnPrimary} onPress={handleSearch}>
                    <Text style={globalStyles.btnText}>Search</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <View style={styles.center}>
                        <Text style={globalStyles.textMuted}>Searching...</Text>
                    </View>
                ) : results.total_count > 0 ? (
                    <>
                        <Text style={globalStyles.textSecondary}>
                            Found {results.total_count} results
                        </Text>

                        {results.items.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>
                                    📦 Items ({results.items.length})
                                </Text>
                                <View style={styles.list}>
                                    {results.items.map((item: any) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={globalStyles.listItem}
                                            onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
                                        >
                                            <Text style={{ fontSize: 20 }}>📦</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={globalStyles.text}>{item.name}</Text>
                                                <Text style={globalStyles.textMuted}>📍 {item.location_path}</Text>
                                            </View>
                                            <Text style={{ color: colors.textMuted }}>→</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {results.locations.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[globalStyles.subtitle, { marginBottom: spacing.md }]}>
                                    🗂️ Locations ({results.locations.length})
                                </Text>
                                <View style={styles.list}>
                                    {results.locations.map((location: any) => (
                                        <TouchableOpacity
                                            key={location.id}
                                            style={globalStyles.listItem}
                                            onPress={() => navigation.navigate('LocationDetail', { id: location.id })}
                                        >
                                            <Text style={{ fontSize: 20 }}>📁</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={globalStyles.text}>{location.name}</Text>
                                                <Text style={globalStyles.textMuted}>{location.location_path}</Text>
                                            </View>
                                            <Text style={{ color: colors.textMuted }}>→</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </>
                ) : searched ? (
                    <View style={styles.emptyState}>
                        <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🔍</Text>
                        <Text style={globalStyles.subtitle}>No results found</Text>
                        <Text style={globalStyles.textMuted}>Try a different search term</Text>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🔍</Text>
                        <Text style={globalStyles.subtitle}>Search for anything</Text>
                        <Text style={globalStyles.textMuted}>
                            Find items and locations by name or alias
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    searchHeader: {
        padding: spacing.lg,
        backgroundColor: colors.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        gap: spacing.md,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 16,
        paddingVertical: spacing.sm,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    center: {
        alignItems: 'center',
        padding: spacing.xxl,
    },
    section: {
        marginTop: spacing.xl,
    },
    list: {
        gap: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xxl,
    },
});
