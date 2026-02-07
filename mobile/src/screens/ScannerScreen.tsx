import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Vibration,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { qrApi } from '../services/api';

export default function ScannerScreen() {
    const navigation = useNavigation<any>();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [scanning, setScanning] = useState(true);

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getBarCodeScannerPermissions();
    }, []);

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        setScanning(false);

        // Haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Extract QR code ID from the scanned URL
        // Expected format: psms://location/psms-loc-xxxxxxxx
        const match = data.match(/psms:\/\/location\/(.+)/);

        if (match && match[1]) {
            const qrCodeId = match[1];

            try {
                const response = await qrApi.scanQr(qrCodeId);
                const location = response.data;

                Alert.alert(
                    'Location Found!',
                    `${location.name}\n${location.item_count} items`,
                    [
                        {
                            text: 'View Location',
                            onPress: () => navigation.navigate('LocationDetail', { id: location.id }),
                        },
                        {
                            text: 'Scan Again',
                            onPress: () => {
                                setScanned(false);
                                setScanning(true);
                            },
                        },
                    ]
                );
            } catch (error) {
                Alert.alert(
                    'Not Found',
                    'This QR code is not registered in the system.',
                    [
                        {
                            text: 'Scan Again',
                            onPress: () => {
                                setScanned(false);
                                setScanning(true);
                            },
                        },
                    ]
                );
            }
        } else {
            Alert.alert(
                'Invalid QR Code',
                'This QR code is not a valid PSMS location code.',
                [
                    {
                        text: 'Scan Again',
                        onPress: () => {
                            setScanned(false);
                            setScanning(true);
                        },
                    },
                ]
            );
        }
    };

    if (hasPermission === null) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={globalStyles.text}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={globalStyles.text}>Camera access denied</Text>
                <Text style={globalStyles.textSecondary}>
                    Please enable camera access in your device settings.
                </Text>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            {scanning && (
                <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={StyleSheet.absoluteFillObject}
                />
            )}

            {/* Overlay */}
            <View style={styles.overlay}>
                <View style={styles.topOverlay} />
                <View style={styles.middleRow}>
                    <View style={styles.sideOverlay} />
                    <View style={styles.scanFrame}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.sideOverlay} />
                </View>
                <View style={styles.bottomOverlay}>
                    <Text style={styles.instructionText}>
                        Point your camera at a location QR code
                    </Text>
                    <TouchableOpacity
                        style={globalStyles.btnSecondary}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={globalStyles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const SCAN_FRAME_SIZE = 250;

const styles = StyleSheet.create({
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    overlay: {
        flex: 1,
    },
    topOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    middleRow: {
        flexDirection: 'row',
        height: SCAN_FRAME_SIZE,
    },
    sideOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    scanFrame: {
        width: SCAN_FRAME_SIZE,
        height: SCAN_FRAME_SIZE,
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: colors.accentPrimary,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderLeftWidth: 3,
        borderTopWidth: 3,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: 0,
        right: 0,
        borderRightWidth: 3,
        borderTopWidth: 3,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderLeftWidth: 3,
        borderBottomWidth: 3,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderRightWidth: 3,
        borderBottomWidth: 3,
        borderBottomRightRadius: 8,
    },
    bottomOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.lg,
    },
    instructionText: {
        color: colors.textPrimary,
        fontSize: 16,
        textAlign: 'center',
    },
});
