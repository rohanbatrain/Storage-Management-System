import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../styles/theme';
import { exportApi } from '../services/api';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const [exportLoading, setExportLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    const loadSummary = async () => {
        try {
            const res = await exportApi.exportSummary();
            setSummary(res.data);
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    };

    React.useEffect(() => {
        loadSummary();
    }, []);

    const handleExport = async () => {
        try {
            setExportLoading(true);
            const res = await exportApi.exportFull();
            const exportData = JSON.stringify(res.data, null, 2);

            await Share.share({
                message: exportData,
                title: 'Storage Manager Backup',
            });

            Alert.alert('Exported!', 'Your data has been exported successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to export data');
        } finally {
            setExportLoading(false);
        }
    };

    const SettingsItem = ({ icon, title, subtitle, onPress, loading = false, danger = false }: any) => (
        <TouchableOpacity
            style={styles.settingsItem}
            onPress={onPress}
            disabled={loading}
        >
            <Text style={styles.settingsIcon}>{icon}</Text>
            <View style={styles.settingsContent}>
                <Text style={[styles.settingsTitle, danger && { color: colors.error }]}>
                    {title}
                </Text>
                {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
            </View>
            {loading ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
            ) : (
                <Text style={styles.chevron}>→</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>⚙️ Settings</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Data Summary */}
                {summary && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📊 Your Data</Text>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>📍 Locations</Text>
                                <Text style={styles.summaryValue}>{summary.locations_count}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>📦 Items</Text>
                                <Text style={styles.summaryValue}>{summary.items_count}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>👔 Outfits</Text>
                                <Text style={styles.summaryValue}>{summary.outfits_count}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Backup & Export */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💾 Backup & Export</Text>
                    <View style={styles.card}>
                        <SettingsItem
                            icon="📤"
                            title="Export All Data"
                            subtitle="Download a JSON backup of everything"
                            onPress={handleExport}
                            loading={exportLoading}
                        />
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ℹ️ About</Text>
                    <View style={styles.card}>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>Version</Text>
                            <Text style={styles.aboutValue}>1.0.0</Text>
                        </View>
                        <View style={styles.aboutItem}>
                            <Text style={styles.aboutLabel}>App</Text>
                            <Text style={styles.aboutValue}>Personal Storage Manager</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    summaryCard: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    summaryLabel: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingsIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    settingsContent: {
        flex: 1,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    settingsSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    chevron: {
        fontSize: 16,
        color: colors.textMuted,
    },
    aboutItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    aboutLabel: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    aboutValue: {
        fontSize: 15,
        color: colors.textPrimary,
    },
});
