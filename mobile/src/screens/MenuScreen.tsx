import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MenuScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const MenuItem = ({ icon, label, onPress, color = colors.textPrimary }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: colors.bgTertiary }]}>
                <Text style={styles.menuIcon}>{icon}</Text>
            </View>
            <Text style={[styles.menuLabel, { color }]}>{label}</Text>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Menu</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Clothing & Laundry</Text>
                    <View style={styles.menuGroup}>
                        <MenuItem
                            icon="👕"
                            label="Wardrobe"
                            onPress={() => navigation.navigate('Wardrobe')}
                        />
                        <MenuItem
                            icon="🧺"
                            label="Laundry"
                            onPress={() => navigation.navigate('Laundry')}
                        />
                        <MenuItem
                            icon="👔"
                            label="Outfits"
                            onPress={() => navigation.navigate('Outfits')}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tools & Settings</Text>
                    <View style={styles.menuGroup}>
                        <MenuItem
                            icon="✈️"
                            label="Trips & Packing"
                            onPress={() => navigation.navigate('Trips')}
                        />
                        <MenuItem
                            icon="📊"
                            label="Wardrobe Analytics"
                            onPress={() => navigation.navigate('Analytics')}
                        />
                        <MenuItem
                            icon="💬"
                            label="Ask SMS"
                            onPress={() => navigation.navigate('Chat')}
                        />
                        <MenuItem
                            icon="🖨️"
                            label="Print QR Codes"
                            onPress={() => navigation.navigate('QRPrint')}
                        />
                        <MenuItem
                            icon="⚙️"
                            label="Settings"
                            onPress={() => navigation.navigate('Settings')}
                        />
                    </View>
                </View>
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    content: {
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.sm,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuGroup: {
        backgroundColor: colors.bgSecondary,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    menuIcon: {
        fontSize: 20,
    },
    menuLabel: {
        flex: 1,
        fontSize: typography.md,
        fontWeight: '500',
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
        fontWeight: '300',
    },
});
