import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiBaseUrl, testConnectionDetailed, pingServer, ConnectionDiagnosis } from '../services/api';
import axios from 'axios';

interface ServerContextType {
    serverUrl: string;
    setServerUrl: (url: string) => Promise<ConnectionDiagnosis>;
    isConnected: boolean;
    setIsConnected: (connected: boolean) => void;
    checkConnection: (urlOverride?: string) => Promise<ConnectionDiagnosis>;
    connectionError: string | null;
    isLoading: boolean;
    serverHistory: string[];
    removeServerFromHistory: (url: string) => Promise<void>;
    disconnect: () => Promise<void>;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const SERVER_URL_KEY = 'sms_server_url';
export const SERVER_HISTORY_KEY = 'sms_server_history';

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const [serverUrl, setServerUrlState] = useState<string>('');
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [serverHistory, setServerHistory] = useState<string[]>([]);

    useEffect(() => {
        loadServerUrl();
    }, []);

    // Background keep-alive ping
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (serverUrl && isConnected) {
            // Ping every 30 seconds to prevent the backend from dropping this client
            interval = setInterval(async () => {
                try {
                    await pingServer(serverUrl);
                } catch (error) {
                    // Fail silently, let the main checkConnection hand major drops
                }
            }, 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [serverUrl, isConnected]);

    const loadServerUrl = async () => {
        try {
            const [storedUrl, storedHistory] = await Promise.all([
                AsyncStorage.getItem(SERVER_URL_KEY),
                AsyncStorage.getItem(SERVER_HISTORY_KEY)
            ]);

            if (storedHistory) {
                try {
                    setServerHistory(JSON.parse(storedHistory));
                } catch (e) {
                    console.error('Failed to parse server history', e);
                }
            }

            if (storedUrl) {
                setServerUrlState(storedUrl);
                setApiBaseUrl(storedUrl);
                await checkConnection(storedUrl);
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Failed to load server context', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setServerUrl = async (url: string): Promise<ConnectionDiagnosis> => {
        // Normalize URL (remove trailing slash)
        const cleanUrl = url.replace(/\/$/, '');
        await AsyncStorage.setItem(SERVER_URL_KEY, cleanUrl);
        setServerUrlState(cleanUrl);
        setApiBaseUrl(cleanUrl);
        return await checkConnection(cleanUrl);
    };

    const checkConnection = async (urlOverride?: string): Promise<ConnectionDiagnosis> => {
        const urlToCheck = urlOverride || serverUrl;
        if (!urlToCheck) {
            setIsConnected(false);
            setConnectionError('No server URL configured.');
            return {
                ok: false,
                diagnosis: 'No server URL configured.',
                code: 'invalid_url',
            };
        }

        const result = await testConnectionDetailed(urlToCheck);

        setIsConnected(result.ok);
        setConnectionError(result.ok ? null : result.diagnosis);

        if (result.ok) {
            console.log(`Connected to server: ${result.diagnosis}`);
            // Add to history if successful
            saveToHistory(urlToCheck);
        } else {
            console.log(`Connection failed: ${result.diagnosis}`);
        }

        return result;
    };

    const saveToHistory = async (url: string) => {
        setServerHistory(prev => {
            // Remove existing entry to move it to the top
            const filtered = prev.filter(u => u !== url);
            const nextHistory = [url, ...filtered].slice(0, 5); // Keep max 5
            AsyncStorage.setItem(SERVER_HISTORY_KEY, JSON.stringify(nextHistory)).catch(e =>
                console.error('Failed to save server history', e)
            );
            return nextHistory;
        });
    };

    const removeServerFromHistory = async (url: string) => {
        setServerHistory(prev => {
            const nextHistory = prev.filter(u => u !== url);
            AsyncStorage.setItem(SERVER_HISTORY_KEY, JSON.stringify(nextHistory)).catch(e =>
                console.error('Failed to update server history', e)
            );
            return nextHistory;
        });
    };

    const disconnect = async () => {
        // Try to alert the server that we are leaving so the 
        // desktop widget "1 Mobile Connected" drops instantly
        if (serverUrl && isConnected) {
            try {
                await axios.delete(`${serverUrl}/api/clients`, { timeout: 2000 });
            } catch (err) {
                // Ignore any network errors, we are disconnecting anyway
            }
        }

        await AsyncStorage.removeItem(SERVER_URL_KEY);
        setServerUrlState('');
        setApiBaseUrl('');
        setIsConnected(false);
        setConnectionError(null);
    };

    return (
        <ServerContext.Provider value={{
            serverUrl,
            setServerUrl,
            isConnected,
            setIsConnected,
            checkConnection,
            connectionError,
            isLoading,
            serverHistory,
            removeServerFromHistory,
            disconnect
        }}>
            {children}
        </ServerContext.Provider>
    );
}

export function useServer() {
    const context = useContext(ServerContext);
    if (context === undefined) {
        throw new Error('useServer must be used within a ServerProvider');
    }
    return context;
}
