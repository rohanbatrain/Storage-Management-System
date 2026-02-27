import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useServer } from '../context/ServerContext';
import { colors, spacing, borderRadius, globalStyles } from '../styles/theme';

export default function ServerConnectionModal() {
    const { isConnected, setServerUrl, isLoading, serverUrl, connectionError } = useServer();
    const [urlInput, setUrlInput] = useState(serverUrl);
    const [showScanner, setShowScanner] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [isChecking, setIsChecking] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        setUrlInput(serverUrl);
    }, [serverUrl]);

    // Show the context-level error or the local error
    const displayError = localError || connectionError;

    const handleConnect = async () => {
        if (!urlInput.trim()) {
            Alert.alert('Error', 'Please enter a valid URL');
            return;
        }

        setIsChecking(true);
        setLocalError(null);
        try {
            const result = await setServerUrl(urlInput.trim());
            if (!result.ok) {
                setLocalError(result.diagnosis);
            }
        } catch (error: any) {
            setLocalError(`Failed to save URL: ${error.message}`);
        } finally {
            setIsChecking(false);
        }
    };

    const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
        setShowScanner(false);
        const scannedData = result.data;

        // Simple validation - check if it looks like a URL
        if (scannedData.startsWith('http')) {
            setUrlInput(scannedData);
            setIsChecking(true);
            setLocalError(null);
            try {
                const connResult = await setServerUrl(scannedData);
                if (!connResult.ok) {
                    setLocalError(connResult.diagnosis);
                    Alert.alert(
                        'Connection Failed',
                        connResult.diagnosis,
                        [
                            { text: 'OK' },
                            {
                                text: 'Retry',
                                onPress: () => handleRetry(scannedData),
                            },
                        ]
                    );
                }
            } catch (error: any) {
                const msg = `Failed to connect: ${error.message}`;
                setLocalError(msg);
                Alert.alert('Connection Failed', msg);
            } finally {
                setIsChecking(false);
            }
        } else {
            Alert.alert('Invalid QR', 'Scanned code does not look like a server URL. Expected something like http://192.168.1.x:8000');
        }
    };

    const handleRetry = async (url?: string) => {
        const targetUrl = url || urlInput;
        if (!targetUrl?.trim()) return;

        setIsChecking(true);
        setLocalError(null);
        try {
            const result = await setServerUrl(targetUrl.trim());
            if (!result.ok) {
                setLocalError(result.diagnosis);
            }
        } catch (error: any) {
            setLocalError(`Retry failed: ${error.message}`);
        } finally {
            setIsChecking(false);
        }
    };

    if (isConnected && !showScanner) return null;

    if (showScanner) {
        if (!permission?.granted) {
            return (
                <Modal visible={true} animationType="slide">
                    <View style={[globalStyles.container, styles.center]}>
                        <Text style={styles.title}>Camera Permission</Text>
                        <Text style={styles.subtitle}>
                            Please allow camera access to scan the server QR code.
                        </Text>
                        <TouchableOpacity
                            style={globalStyles.btnPrimary}
                            onPress={requestPermission}
                        >
                            <Text style={globalStyles.btnText}>Grant Permission</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[globalStyles.btnSecondary, { marginTop: spacing.md }]}
                            onPress={() => setShowScanner(false)}
                        >
                            <Text style={globalStyles.btnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            );
        }

        return (
            <Modal visible={true} animationType="slide">
                <View style={globalStyles.container}>
                    <CameraView
                        onBarcodeScanned={handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.scannerOverlay}>
                        <Text style={styles.scannerText}>Scan the Server URL QR Code</Text>
                        <TouchableOpacity
                            style={globalStyles.btnSecondary}
                            onPress={() => setShowScanner(false)}
                        >
                            <Text style={globalStyles.btnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    // Main Input Modal
    return (
        <Modal visible={!isConnected} animationType="fade" transparent={false}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.content}>
                    <Text style={styles.icon}>🔌</Text>
                    <Text style={styles.title}>Connect to Server</Text>
                    <Text style={styles.subtitle}>
                        Enter the Server URL from your Desktop App or scan the QR code.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="http://192.168.1.x:8000"
                        placeholderTextColor={colors.textMuted}
                        value={urlInput}
                        onChangeText={(text) => {
                            setUrlInput(text);
                            setLocalError(null); // Clear error when user edits
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />

                    {/* Error Banner */}
                    {displayError && !isChecking && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{displayError}</Text>
                            <TouchableOpacity
                                style={styles.retryBtn}
                                onPress={() => handleRetry()}
                            >
                                <Text style={styles.retryBtnText}>↻ Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[globalStyles.btnPrimary, isChecking && styles.disabledBtn]}
                            onPress={handleConnect}
                            disabled={isChecking}
                        >
                            {isChecking ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={globalStyles.btnText}>Connect</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[globalStyles.btnSecondary, styles.scanBtn]}
                            onPress={() => setShowScanner(true)}
                            disabled={isChecking}
                        >
                            <Text style={globalStyles.btnText}>📷 Scan QR Code</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={colors.accentPrimary} />
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    input: {
        width: '100%',
        backgroundColor: colors.bgSecondary,
        color: colors.textPrimary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: 16,
        marginBottom: spacing.lg,
    },
    buttonContainer: {
        width: '100%',
        gap: spacing.md,
    },
    scanBtn: {
        backgroundColor: colors.bgSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    scannerOverlay: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        alignItems: 'center',
        gap: spacing.md,
    },
    scannerText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Error banner
    errorBanner: {
        width: '100%',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    errorText: {
        fontSize: 13,
        color: '#fca5a5',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: spacing.sm,
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.sm,
    },
    retryBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fca5a5',
    },
});
