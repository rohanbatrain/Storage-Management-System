import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Image,
    Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import api from '../services/api';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
    const insets = useSafeAreaInsets();
    const [data, setData] = useState<any>(null);
    const [declutter, setDeclutter] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currencyOptions, setCurrencyOptions] = useState('₹');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cpwRes, declusterRes] = await Promise.all([
                    api.get('/analytics/cost-per-wear'),
                    api.get('/analytics/declutter?days=365')
                ]);
                setData(cpwRes.data);
                setDeclutter(declusterRes.data);

                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const pref = await AsyncStorage.getItem('sms_currency_preference');
                if (pref) setCurrencyOptions(pref);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.accentPrimary} />
            </View>
        );
    }

    // Bar Chart Data (Top 5 worst value)
    const chartItems = data?.items?.slice(0, 5) || [];
    const chartData = {
        labels: chartItems.map((i: any) => i.name.substring(0, 8) + '...'),
        datasets: [
            {
                data: chartItems.map((i: any) => i.cost_per_wear),
            }
        ]
    };

    const chartConfig = {
        backgroundColor: colors.bgSecondary,
        backgroundGradientFrom: colors.bgSecondary,
        backgroundGradientTo: colors.bgSecondary,
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        labelColor: (opacity = 1) => colors.textMuted,
        fillShadowGradientFrom: colors.accentPrimary,
        fillShadowGradientTo: colors.accentPrimary,
        fillShadowGradientFromOpacity: 0.8,
        fillShadowGradientToOpacity: 0.8,
        barPercentage: 0.7,
        propsForLabels: {
            fontSize: 10,
        }
    };

    // Find most worn
    let mostWorn = null;
    if (data?.items && data.items.length > 0) {
        mostWorn = [...data.items].sort((a, b) => b.wear_count - a.wear_count)[0];
    }

    return (
        <ScrollView
            style={globalStyles.container}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 80 }}
        >
            <Text style={styles.title}>Wardrobe Value</Text>

            {/* Metric Cards */}
            <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>TOTAL VALUE</Text>
                    <Text style={styles.metricValue}>{currencyOptions}{data?.total_wardrobe_value?.toLocaleString() || '0'}</Text>
                    <Text style={styles.metricSub}>Across {data?.items_analyzed || 0} items</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Text style={[styles.metricLabel, { color: colors.error }]}>DECLUTTER targets</Text>
                    <Text style={[styles.metricValue, { color: colors.error }]}>{declutter?.suggested_declutter_count || 0}</Text>
                    <Text style={[styles.metricSub, { color: colors.error }]}>Unworn 365+ days</Text>
                </View>
            </View>

            {mostWorn && (
                <View style={styles.mostWornCard}>
                    <View style={styles.mostWornInfo}>
                        <Text style={styles.metricLabel}>BEST VALUE ITEM</Text>
                        <Text style={styles.mostWornName} numberOfLines={1}>{mostWorn.name}</Text>
                        <Text style={styles.mostWornDetail}>
                            Cost per wear: {currencyOptions}{mostWorn.cost_per_wear.toFixed(2)}
                        </Text>
                    </View>
                    {mostWorn.image_url && (
                        <Image source={{ uri: mostWorn.image_url }} style={styles.mostWornImage} />
                    )}
                </View>
            )}

            {/* CPW Chart */}
            <Text style={[styles.title, { marginTop: spacing.xl, fontSize: 18 }]}>Highest Cost-Per-Wear</Text>
            {chartItems.length > 0 ? (
                <View style={styles.chartContainer}>
                    <BarChart
                        data={chartData}
                        width={screenWidth - (spacing.md * 2) - 30}
                        height={220}
                        yAxisLabel={currencyOptions}
                        yAxisSuffix=""
                        chartConfig={chartConfig}
                        verticalLabelRotation={30}
                        style={{ borderRadius: borderRadius.md, marginTop: spacing.sm }}
                        showValuesOnTopOfBars
                    />
                </View>
            ) : (
                <View style={styles.emptyChart}>
                    <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>📉</Text>
                    <Text style={styles.emptyText}>Add purchase prices to your items to see analytics.</Text>
                </View>
            )}

            {/* Declutter Targets */}
            {declutter?.items && declutter.items.length > 0 && (
                <>
                    <Text style={[styles.title, { marginTop: spacing.xl, fontSize: 18, color: colors.error }]}>
                        Declutter Candidates
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.declutterScroll}>
                        {declutter.items.map((item: any) => (
                            <View key={item.id} style={styles.declutterItem}>
                                <View style={styles.declutterImageContainer}>
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} style={styles.declutterImage} />
                                    ) : (
                                        <Text style={{ fontSize: 24, opacity: 0.5 }}>👕</Text>
                                    )}
                                </View>
                                <Text style={styles.declutterName} numberOfLines={1}>{item.name}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.md,
        letterSpacing: -0.5,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    metricCard: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    metricSub: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    mostWornCard: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    mostWornInfo: {
        flex: 1,
    },
    mostWornName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.accentPrimary,
        marginBottom: 2,
    },
    mostWornDetail: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    mostWornImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: colors.bgTertiary,
    },
    chartContainer: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        overflow: 'hidden',
    },
    emptyChart: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        textAlign: 'center',
        fontSize: 14,
    },
    declutterScroll: {
        flexDirection: 'row',
    },
    declutterItem: {
        width: 100,
        marginRight: spacing.sm,
    },
    declutterImageContainer: {
        width: 100,
        height: 100,
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
        overflow: 'hidden',
    },
    declutterImage: {
        width: '100%',
        height: '100%',
    },
    declutterName: {
        fontSize: 12,
        color: colors.textPrimary,
        textAlign: 'center',
    }
});
