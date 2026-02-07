import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Animated,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { searchApi } from '../services/api';

// Animated search result card
const SearchResultCard = ({
    item,
    type,
    onPress,
    index
}: {
    item: any;
    type: 'item' | 'location';
    onPress: () => void;
    index: number;
}) => {
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(20);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const icon = type === 'item' ? '📦' : '🗂️';
    const accentColor = type === 'item' ? colors.accentPrimary : colors.success;

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
        >
            <TouchableOpacity
                style={[styles.resultCard, { borderLeftColor: accentColor }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.resultIconWrapper, { backgroundColor: accentColor + '20' }]}>
                    <Text style={styles.resultIcon}>{icon}</Text>
                </View>
                <View style={styles.resultContent}>
                    <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.resultPath} numberOfLines={1}>
                        📍 {item.location_path || item.name}
                    </Text>
                </View>
                <View style={styles.resultArrow}>
                    <Text style={styles.arrowText}>→</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Quick filter chips
const FilterChip = ({
    label,
    count,
    active,
    onPress
}: {
    label: string;
    count: number;
    active: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text>
        <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
            <Text style={[styles.filterCount, active && styles.filterCountActive]}>{count}</Text>
        </View>
    </TouchableOpacity>
);

export default function SearchScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>({ items: [], locations: [], total_count: 0 });
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [filter, setFilter] = useState<'all' | 'items' | 'locations'>('all');

    const handleSearch = async (searchQuery?: string) => {
        const q = searchQuery ?? query;
        if (!q.trim()) return;

        Keyboard.dismiss();
        setLoading(true);
        setSearched(true);
        try {
            const response = await searchApi.search(q);
            setResults(response.data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = filter === 'locations' ? [] : results.items;
    const filteredLocations = filter === 'items' ? [] : results.locations;
    const totalFiltered = filteredItems.length + filteredLocations.length;

    return (
        <View style={[globalStyles.container, { paddingTop: insets.top }]}>
            {/* Modern Search Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Search</Text>
                <Text style={styles.headerSubtitle}>Find items & locations</Text>
            </View>

            {/* Floating Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="What are you looking for?"
                        placeholderTextColor={colors.textMuted}
                        value={query}
                        onChangeText={(text) => {
                            setQuery(text);
                            if (text.length > 2) {
                                handleSearch(text);
                            }
                        }}
                        onSubmitEditing={() => handleSearch()}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                setQuery('');
                                setResults({ items: [], locations: [], total_count: 0 });
                                setSearched(false);
                            }}
                            style={styles.clearButton}
                        >
                            <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Chips */}
            {results.total_count > 0 && (
                <View style={styles.filterRow}>
                    <FilterChip
                        label="All"
                        count={results.total_count}
                        active={filter === 'all'}
                        onPress={() => setFilter('all')}
                    />
                    <FilterChip
                        label="Items"
                        count={results.items.length}
                        active={filter === 'items'}
                        onPress={() => setFilter('items')}
                    />
                    <FilterChip
                        label="Locations"
                        count={results.locations.length}
                        active={filter === 'locations'}
                        onPress={() => setFilter('locations')}
                    />
                </View>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: 100 + insets.bottom }
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.stateContainer}>
                        <View style={styles.loadingDots}>
                            <View style={[styles.dot, styles.dot1]} />
                            <View style={[styles.dot, styles.dot2]} />
                            <View style={[styles.dot, styles.dot3]} />
                        </View>
                        <Text style={styles.stateText}>Searching...</Text>
                    </View>
                ) : totalFiltered > 0 ? (
                    <>
                        {/* Items Section */}
                        {filteredItems.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>📦 Items</Text>
                                    <Text style={styles.sectionCount}>{filteredItems.length}</Text>
                                </View>
                                {filteredItems.map((item: any, index: number) => (
                                    <SearchResultCard
                                        key={item.id}
                                        item={item}
                                        type="item"
                                        index={index}
                                        onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Locations Section */}
                        {filteredLocations.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>🗂️ Locations</Text>
                                    <Text style={styles.sectionCount}>{filteredLocations.length}</Text>
                                </View>
                                {filteredLocations.map((location: any, index: number) => (
                                    <SearchResultCard
                                        key={location.id}
                                        item={location}
                                        type="location"
                                        index={index}
                                        onPress={() => navigation.navigate('LocationDetail', { id: location.id })}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                ) : searched ? (
                    <View style={styles.stateContainer}>
                        <View style={styles.emptyIcon}>
                            <Text style={styles.emptyEmoji}>🔍</Text>
                        </View>
                        <Text style={styles.emptyTitle}>No results found</Text>
                        <Text style={styles.emptySubtitle}>Try a different search term</Text>
                    </View>
                ) : (
                    <View style={styles.stateContainer}>
                        <View style={styles.welcomeIcon}>
                            <Text style={styles.welcomeEmoji}>✨</Text>
                        </View>
                        <Text style={styles.welcomeTitle}>Start searching</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Find items and locations by name{'\n'}or description
                        </Text>

                        {/* Quick suggestions */}
                        <View style={styles.suggestions}>
                            <Text style={styles.suggestionsLabel}>Try searching for:</Text>
                            <View style={styles.suggestionChips}>
                                {['Clothes', 'Kitchen', 'Documents'].map((term) => (
                                    <TouchableOpacity
                                        key={term}
                                        style={styles.suggestionChip}
                                        onPress={() => {
                                            setQuery(term);
                                            handleSearch(term);
                                        }}
                                    >
                                        <Text style={styles.suggestionText}>{term}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 15,
        color: colors.textMuted,
        marginTop: 4,
    },
    searchContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
    },
    clearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        gap: spacing.xs,
    },
    filterChipActive: {
        backgroundColor: colors.accentPrimary,
    },
    filterLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    filterLabelActive: {
        color: colors.textPrimary,
    },
    filterBadge: {
        backgroundColor: colors.bgTertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    filterBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    filterCount: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: '600',
    },
    filterCountActive: {
        color: colors.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    stateContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
    },
    loadingDots: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.lg,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accentPrimary,
    },
    dot1: { opacity: 0.4 },
    dot2: { opacity: 0.7 },
    dot3: { opacity: 1 },
    stateText: {
        fontSize: 15,
        color: colors.textMuted,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    sectionCount: {
        fontSize: 14,
        color: colors.textMuted,
        backgroundColor: colors.bgSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderLeftWidth: 3,
    },
    resultIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    resultIcon: {
        fontSize: 22,
    },
    resultContent: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    resultPath: {
        fontSize: 13,
        color: colors.textMuted,
    },
    resultArrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyEmoji: {
        fontSize: 36,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: 15,
        color: colors.textMuted,
    },
    welcomeIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.accentPrimary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    welcomeEmoji: {
        fontSize: 44,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    suggestions: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    suggestionsLabel: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    suggestionChips: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    suggestionChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestionText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
});
