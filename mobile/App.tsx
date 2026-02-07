import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import LocationsScreen from './src/screens/LocationsScreen';
import LocationDetailScreen from './src/screens/LocationDetailScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import SearchScreen from './src/screens/SearchScreen';

const Stack = createNativeStackNavigator();

// Custom dark theme for navigation
const DarkTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#6366f1',
        background: '#0f0f14',
        card: '#1a1a24',
        text: '#f8fafc',
        border: 'rgba(255, 255, 255, 0.08)',
        notification: '#ef4444',
    },
};

export default function App() {
    return (
        <NavigationContainer theme={DarkTheme}>
            <StatusBar style="light" />
            <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#1a1a24',
                    },
                    headerTintColor: '#f8fafc',
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerShadowVisible: false,
                }}
            >
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
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
            </Stack.Navigator>
        </NavigationContainer>
    );
}
