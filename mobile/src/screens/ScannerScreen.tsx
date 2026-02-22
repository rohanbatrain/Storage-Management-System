import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { qrApi, saveApiBaseUrl } from '../services/api';

export default function ScannerScreen() {
    const navigation = useNavigation<any>();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanning, setScanning] = useState(true);

    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
        if (scanned) return;
        setScanned(true);
        setScanning(false);

        // Haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Check if it's a server connection URL
        if (result.data.startsWith('http://') || result.data.startsWith('https://')) {
            Alert.alert(
                'Connect to Server?',
                `Do you want to connect your mobile app to this server?\n\n${result.data}`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => {
                            setScanned(false);
                            setScanning(true);
                        },
                    },
                    {
                        text: 'Connect',
                        onPress: async () => {
                            await saveApiBaseUrl(result.data);
                            Alert.alert('Connected!', 'Successfully connected to server.', [
                                { text: 'OK', onPress: () => navigation.navigate('Home') }
                            ]);
                        },
                    },
                ]
            );
            return;
        }

        // Extract QR code ID from the scanned URL
        // Expected formats: 
        // - sms://location/sms-loc-xxxxxxxx
        // - sms://item/sms-item-xxxxxxxx
        const locationMatch = result.data.match(/sms:\/\/location\/(.+)/);
        const itemMatch = result.data.match(/sms:\/\/item\/(.+)/);

        const qrCodeId = locationMatch?.[1] || itemMatch?.[1];

        if (qrCodeId) {
            try {
                const response = await qrApi.scanQr(qrCodeId);
                const { type, data } = response.data;

                if (type === 'location') {
                    Alert.alert(
                        '📍 Location Found!',
                        `${data.name}\n${data.item_count} items • ${data.kind || 'storage'}`,
                        [
                            {
                                text: 'View Location',
                                onPress: () => navigation.navigate('LocationDetail', { id: data.id }),
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
                } else if (type === 'item') {
                    Alert.alert(
                        '📦 Item Found!',
                        `${data.name}\n📍 Location: ${data.current_location}${data.is_temporary_placement ? '\n⚠️ Temporarily placed' : ''}`,
                        [
                            {
                                text: 'View Item',
                                onPress: () => navigation.navigate('ItemDetail', { id: data.id }),
                            },
                            {
                                text: 'View Location',
                                onPress: () => navigation.navigate('LocationDetail', { id: data.current_location_id }),
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
                }
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
                'This QR code is not a valid SMS code.',
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

    if (!permission) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={globalStyles.text}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[globalStyles.container, styles.center]}>
                <Text style={globalStyles.text}>Camera access denied</Text>
                <Text style={[globalStyles.textSecondary, { marginBottom: spacing.md }]}>
                    Please enable camera access in your device settings.
                </Text>
                <TouchableOpacity style={globalStyles.btnPrimary} onPress={requestPermission}>
                    <Text style={globalStyles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            {scanning && (
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
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
