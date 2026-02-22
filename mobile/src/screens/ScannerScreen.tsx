import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
    Animated,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';
import { qrApi, identifyApi, saveApiBaseUrl } from '../services/api';

type ScanMode = 'auto' | 'qr' | 'lens';

export default function ScannerScreen() {
    const navigation = useNavigation<any>();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanning, setScanning] = useState(true);
    const [mode, setMode] = useState<ScanMode>('auto');
    const [identifying, setIdentifying] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!permission) requestPermission();
    }, [permission]);

    // Pulse animation for the shutter button
    useEffect(() => {
        if (mode !== 'qr') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [mode]);

    const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
        if (scanned || mode === 'lens') return;
        setScanned(true);
        setScanning(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Server connection URL
        if (result.data.startsWith('http://') || result.data.startsWith('https://')) {
            Alert.alert(
                'Connect to Server?',
                `Connect to:\n${result.data}`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => { setScanned(false); setScanning(true); } },
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

        // SMS QR codes
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
                        `${data.name}\n${data.item_count} items • ${data.kind || 'room'}`,
                        [
                            { text: 'View Location', onPress: () => navigation.navigate('LocationDetail', { id: data.id }) },
                            { text: 'Scan Again', onPress: () => { setScanned(false); setScanning(true); } },
                        ]
                    );
                } else if (type === 'item') {
                    Alert.alert(
                        '📦 Item Found!',
                        `${data.name}\n📍 ${data.current_location}${data.is_temporary_placement ? '\n⚠️ Temporarily placed' : ''}`,
                        [
                            { text: 'View Item', onPress: () => navigation.navigate('ItemDetail', { id: data.id }) },
                            { text: 'Scan Again', onPress: () => { setScanned(false); setScanning(true); } },
                        ]
                    );
                }
            } catch {
                Alert.alert('Not Found', 'This QR code is not registered.', [
                    { text: 'Scan Again', onPress: () => { setScanned(false); setScanning(true); } },
                ]);
            }
        } else {
            Alert.alert('Invalid QR Code', 'This is not a valid SMS QR code.', [
                { text: 'Scan Again', onPress: () => { setScanned(false); setScanning(true); } },
            ]);
        }
    };

    const handleLensCapture = async () => {
        if (!cameraRef.current || identifying) return;
        setIdentifying(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: false,
            });

            if (!photo) {
                setIdentifying(false);
                return;
            }

            const response = await identifyApi.identify({
                uri: photo.uri,
                type: 'image/jpeg',
                fileName: 'lens_capture.jpg',
            });

            const data = response.data;
            setMatches(data.matches || []);
            setShowResults(true);

            if (!data.matches || data.matches.length === 0) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } else {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to identify. Make sure the server is running.');
        } finally {
            setIdentifying(false);
        }
    };

    const dismissResults = () => {
        setShowResults(false);
        setMatches([]);
    };

    // Permission states
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

    const showQrScanning = mode === 'auto' || mode === 'qr';
    const showShutter = mode === 'auto' || mode === 'lens';

    return (
        <View style={globalStyles.container}>
            {scanning && (
                <CameraView
                    ref={cameraRef}
                    onBarcodeScanned={showQrScanning && !scanned ? handleBarCodeScanned : undefined}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    style={StyleSheet.absoluteFillObject}
                />
            )}

            {/* Overlay */}
            <View style={styles.overlay}>
                <View style={styles.topOverlay} />

                {/* Scan frame — only in QR/Auto modes */}
                {showQrScanning && (
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
                )}

                {/* Lens crosshair — only in Lens mode */}
                {mode === 'lens' && (
                    <View style={styles.middleRow}>
                        <View style={styles.sideOverlay} />
                        <View style={[styles.scanFrame, styles.lensFrame]}>
                            <View style={styles.crosshairH} />
                            <View style={styles.crosshairV} />
                        </View>
                        <View style={styles.sideOverlay} />
                    </View>
                )}

                {/* Bottom controls */}
                <View style={styles.bottomOverlay}>
                    {/* Instruction */}
                    <Text style={styles.instructionText}>
                        {mode === 'qr' && 'Point at a QR code'}
                        {mode === 'lens' && 'Point at an item and tap the shutter'}
                        {mode === 'auto' && 'QR scanning active • Tap shutter to identify'}
                    </Text>

                    {/* Shutter button for Lens/Auto */}
                    {showShutter && (
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <TouchableOpacity
                                style={[styles.shutterButton, identifying && styles.shutterDisabled]}
                                onPress={handleLensCapture}
                                disabled={identifying}
                                activeOpacity={0.7}
                            >
                                {identifying ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <View style={styles.shutterInner} />
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Mode Toggle */}
                    <View style={styles.modeBar}>
                        {(['qr', 'auto', 'lens'] as ScanMode[]).map((m) => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modeButton, mode === m && styles.modeActive]}
                                onPress={() => {
                                    setMode(m);
                                    setScanned(false);
                                    setScanning(true);
                                    setShowResults(false);
                                    Haptics.selectionAsync();
                                }}
                            >
                                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                                    {m === 'qr' ? '📱 QR' : m === 'lens' ? '🔍 Lens' : '⚡ Auto'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            {/* Match Results Overlay */}
            {showResults && (
                <View style={styles.resultsOverlay}>
                    <View style={styles.resultsContainer}>
                        <View style={styles.resultsHeader}>
                            <Text style={styles.resultsTitle}>
                                {matches.length > 0 ? '🎯 Matches Found' : '🔍 No Matches'}
                            </Text>
                            <TouchableOpacity onPress={dismissResults}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {matches.length === 0 ? (
                            <View style={styles.noResults}>
                                <Text style={globalStyles.textSecondary}>
                                    No enrolled items match this image.
                                </Text>
                                <Text style={globalStyles.textMuted}>
                                    Enroll items from their detail screen first.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.matchList}>
                                {matches.map((match: any, idx: number) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.matchCard}
                                        onPress={() => {
                                            dismissResults();
                                            navigation.navigate('ItemDetail', { id: match.item?.id });
                                        }}
                                    >
                                        {match.reference_image && (
                                            <Image
                                                source={{ uri: match.reference_image }}
                                                style={styles.matchImage}
                                            />
                                        )}
                                        <View style={styles.matchInfo}>
                                            <Text style={styles.matchName} numberOfLines={1}>
                                                {match.item?.name || 'Unknown Item'}
                                            </Text>
                                            <Text style={styles.matchLocation} numberOfLines={1}>
                                                📍 {match.item?.current_location || 'Unknown'}
                                            </Text>
                                        </View>
                                        <View style={[
                                            styles.confidenceBadge,
                                            { backgroundColor: match.confidence >= 80 ? colors.success + '30' : colors.warning + '30' }
                                        ]}>
                                            <Text style={[
                                                styles.confidenceText,
                                                { color: match.confidence >= 80 ? colors.success : colors.warning }
                                            ]}>
                                                {match.confidence}%
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[globalStyles.btnSecondary, { marginTop: spacing.md }]}
                            onPress={dismissResults}
                        >
                            <Text style={globalStyles.btnText}>Scan Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    middleRow: {
        flexDirection: 'row',
        height: SCAN_FRAME_SIZE,
    },
    sideOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    scanFrame: {
        width: SCAN_FRAME_SIZE,
        height: SCAN_FRAME_SIZE,
    },
    lensFrame: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    crosshairH: {
        position: 'absolute',
        width: 60,
        height: 2,
        backgroundColor: colors.accentSecondary,
        borderRadius: 1,
    },
    crosshairV: {
        position: 'absolute',
        width: 2,
        height: 60,
        backgroundColor: colors.accentSecondary,
        borderRadius: 1,
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: colors.accentPrimary,
    },
    topLeft: {
        top: 0, left: 0,
        borderLeftWidth: 3, borderTopWidth: 3,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: 0, right: 0,
        borderRightWidth: 3, borderTopWidth: 3,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: 0, left: 0,
        borderLeftWidth: 3, borderBottomWidth: 3,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: 0, right: 0,
        borderRightWidth: 3, borderBottomWidth: 3,
        borderBottomRightRadius: 8,
    },
    bottomOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: spacing.xxl,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    instructionText: {
        color: colors.textPrimary,
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.9,
    },
    // Shutter button
    shutterButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    shutterDisabled: {
        opacity: 0.5,
    },
    shutterInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
    },
    // Mode toggle bar
    modeBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: borderRadius.xl,
        padding: 4,
        gap: 4,
    },
    modeButton: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: borderRadius.lg,
    },
    modeActive: {
        backgroundColor: colors.accentPrimary,
    },
    modeText: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
    },
    modeTextActive: {
        color: '#fff',
    },
    // Results overlay
    resultsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    resultsContainer: {
        backgroundColor: colors.bgSecondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.lg,
        maxHeight: '70%',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    closeButton: {
        fontSize: 22,
        color: colors.textMuted,
        padding: spacing.sm,
    },
    noResults: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    matchList: {
        maxHeight: 300,
    },
    matchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgTertiary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    matchImage: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.bgElevated,
    },
    matchInfo: {
        flex: 1,
        gap: 2,
    },
    matchName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    matchLocation: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    confidenceBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: borderRadius.full,
    },
    confidenceText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
