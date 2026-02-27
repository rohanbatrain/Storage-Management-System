import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiBaseUrl, testConnectionDetailed, ConnectionDiagnosis } from '../services/api';

interface ServerContextType {
    serverUrl: string;
    setServerUrl: (url: string) => Promise<ConnectionDiagnosis>;
    isConnected: boolean;
    setIsConnected: (connected: boolean) => void;
    checkConnection: (urlOverride?: string) => Promise<ConnectionDiagnosis>;
    connectionError: string | null;
    isLoading: boolean;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const SERVER_URL_KEY = 'sms_server_url';

export function ServerProvider({ children }: { children: React.ReactNode }) {
    const [serverUrl, setServerUrlState] = useState<string>('');
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        loadServerUrl();
    }, []);

    const loadServerUrl = async () => {
        try {
            const storedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
            if (storedUrl) {
                setServerUrlState(storedUrl);
                setApiBaseUrl(storedUrl);
                await checkConnection(storedUrl);
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Failed to load server URL', error);
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
        } else {
            console.log(`Connection failed: ${result.diagnosis}`);
        }

        return result;
    };

    return (
        <ServerContext.Provider value={{
            serverUrl,
            setServerUrl,
            isConnected,
            setIsConnected,
            checkConnection,
            connectionError,
            isLoading
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
