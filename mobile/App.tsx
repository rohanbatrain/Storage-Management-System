import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import LocationsScreen from './src/screens/LocationsScreen';
import LocationDetailScreen from './src/screens/LocationDetailScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import WardrobeScreen from './src/screens/WardrobeScreen';
import LaundryScreen from './src/screens/LaundryScreen';
import OutfitsScreen from './src/screens/OutfitsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import QRPrintScreen from './src/screens/QRPrintScreen';
import MenuScreen from './src/screens/MenuScreen';
import ChatScreen from './src/screens/ChatScreen';
import { colors } from './src/styles/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom dark theme for navigation
const DarkTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.accentPrimary,
        background: colors.bgPrimary,
        card: colors.bgSecondary,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.error,
    },
};

// Tab bar icon component
const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
    <View style={[styles.tabIconWrapper, focused && styles.tabIconFocused]}>
        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    </View>
);

// Bottom Tab Navigator with safe area
function MainTabs() {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: 65 + insets.bottom,
                        paddingBottom: insets.bottom + 8,
                    }
                ],
                tabBarActiveTintColor: colors.accentPrimary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="🏠" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="LocationsTab"
                component={LocationsScreen}
                options={{
                    title: 'Locations',
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="🗂️" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="ScanTab"
                component={ScannerScreen}
                options={{
                    title: 'Scan',
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...props}
                            style={{
                                top: -20,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <View style={styles.scanButton}>
                                <Text style={styles.scanIcon}>📷</Text>
                            </View>
                        </TouchableOpacity>
                    ),
                }}
            />
            <Tab.Screen
                name="SearchTab"
                component={SearchScreen}
                options={{
                    title: 'Search',
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="🔍" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="MenuTab"
                component={MenuScreen}
                options={{
                    title: 'Menu',
                    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="☰" focused={focused} />,
                }}
            />
        </Tab.Navigator>
    );
}

// Animated Splash Screen Component
function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
    const fadeAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(0.8);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(onFinish);
            }, 1000);
        });
    }, []);

    return (
        <View style={styles.splashContainer}>
            <Animated.View
                style={[
                    styles.splashContent,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <Text style={styles.splashIcon}>📦</Text>
                <Text style={styles.splashTitle}>SMS</Text>
                <Text style={styles.splashSubtitle}>Storage Management System</Text>
            </Animated.View>
        </View>
    );
}

function AppContent() {
    const [appIsReady, setAppIsReady] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        async function prepare() {
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
                console.warn(e);
            } finally {
                setAppIsReady(true);
            }
        }
        prepare();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    const handleSplashFinish = () => {
        setShowSplash(false);
    };

    if (!appIsReady) {
        return null;
    }

    if (showSplash) {
        return (
            <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
                <StatusBar style="light" />
                <AnimatedSplash onFinish={handleSplashFinish} />
            </View>
        );
    }

    return (
        <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
            <NavigationContainer theme={DarkTheme}>
                <StatusBar style="light" />
                <Stack.Navigator
                    initialRouteName="Main"
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: colors.bgSecondary,
                        },
                        headerTintColor: colors.textPrimary,
                        headerTitleStyle: {
                            fontWeight: '600',
                        },
                        headerShadowVisible: false,
                        headerBackTitleVisible: false,
                    }}
                >
                    <Stack.Screen
                        name="Main"
                        component={MainTabs}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Scanner"
                        component={ScannerScreen}
                        options={{
                            title: 'Scan QR Code',
                            headerTransparent: true,
                        }}
                    />
                    <Stack.Screen
                        name="Locations"
                        component={LocationsScreen}
                        options={{ title: 'Storage Locations' }}
                    />
                    <Stack.Screen
                        name="LocationDetail"
                        component={LocationDetailScreen}
                        options={{ title: 'Location' }}
                    />
                    <Stack.Screen
                        name="ItemDetail"
                        component={ItemDetailScreen}
                        options={{ title: 'Item Details' }}
                    />
                    <Stack.Screen
                        name="Search"
                        component={SearchScreen}
                        options={{ title: 'Search' }}
                    />
                    <Stack.Screen
                        name="Wardrobe"
                        component={WardrobeScreen}
                        options={{ title: 'Wardrobe' }}
                    />
                    <Stack.Screen
                        name="Laundry"
                        component={LaundryScreen}
                        options={{ title: 'Laundry' }}
                    />
                    <Stack.Screen
                        name="Outfits"
                        component={OutfitsScreen}
                        options={{ title: 'Outfits' }}
                    />
                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{ title: 'Settings' }}
                    />
                    <Stack.Screen
                        name="QRPrint"
                        component={QRPrintScreen}
                        options={{ title: 'Print QR Codes' }}
                    />
                    <Stack.Screen
                        name="Chat"
                        component={ChatScreen}
                        options={{ title: 'Ask SMS' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </View>
    );
}

import { ServerProvider } from './src/context/ServerContext';
import ServerConnectionModal from './src/components/ServerConnectionModal';

export default function App() {
    return (
        <SafeAreaProvider>
            <ServerProvider>
                <AppContent />
                <ServerConnectionModal />
            </ServerProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    // Tab Bar
    tabBar: {
        backgroundColor: colors.bgSecondary,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingTop: 8,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    tabIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIconFocused: {
        backgroundColor: colors.accentPrimary + '20',
    },
    tabIcon: {
        fontSize: 22,
    },
    tabIconActive: {
        fontSize: 24,
    },
    // Scan Button (center tab)
    scanButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accentPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -16,
        shadowColor: colors.accentPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    scanIcon: {
        fontSize: 26,
    },
    // Splash Screen
    splashContainer: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashContent: {
        alignItems: 'center',
    },
    splashIcon: {
        fontSize: 80,
        marginBottom: 16,
    },
    splashTitle: {
        fontSize: 42,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 2,
    },
    splashSubtitle: {
        fontSize: 16,
        color: colors.textMuted,
        marginTop: 8,
    },
});
