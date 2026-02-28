import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// Default base URL — overwritten by ServerContext on startup
let API_BASE_URL = 'http://192.168.1.4:8000';

const deviceName = Device.deviceName || `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`;

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
        'X-Device-Name': deviceName,
    },
    timeout: 10000,
});

export const setApiBaseUrl = (url: string) => {
    API_BASE_URL = url;
    api.defaults.baseURL = `${url}/api`;
    console.log('API Base URL set to:', api.defaults.baseURL);
};

export const saveApiBaseUrl = async (url: string) => {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
    }
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = `http://${cleanUrl}`;
    }

    setApiBaseUrl(cleanUrl);
    // Use the same key as ServerContext (sms_server_url)
    await AsyncStorage.setItem('sms_server_url', cleanUrl);
};


// Location API - Full CRUD + Aliases
export const locationApi = {
    list: () => api.get('/locations'),
    getTree: () => api.get('/locations/tree'),
    get: (id: string) => api.get(`/locations/${id}`),
    getLocationTree: (id: string) => api.get(`/locations/${id}/tree`),
    create: (data: any) => api.post('/locations', data),
    update: (id: string, data: any) => api.put(`/locations/${id}`, data),
    delete: (id: string) => api.delete(`/locations/${id}`),
    deleteAll: () => api.delete('/locations/all'),
    // Aliases
    addAlias: (id: string, alias: string) => api.post(`/locations/${id}/alias`, { alias }),
    removeAlias: (id: string, alias: string) => api.delete(`/locations/${id}/alias/${alias}`),
};

// Item API - Full CRUD + History
export const itemApi = {
    list: (params?: any) => api.get('/items', { params }),
    get: (id: string) => api.get(`/items/${id}`),
    create: (data: any) => api.post('/items', data),
    update: (id: string, data: any) => api.put(`/items/${id}`, data),
    delete: (id: string) => api.delete(`/items/${id}`),
    move: (id: string, data: any) => api.post(`/items/${id}/move`, data),
    return: (id: string) => api.post(`/items/${id}/return`),
    wear: (id: string) => api.post(`/items/${id}/wear`),
    // History
    getHistory: (id: string) => api.get(`/items/${id}/history`),
    // Loan tracking
    lend: (id: string, borrower: string, dueDate?: string, notes?: string) =>
        api.post(`/items/${id}/lend`, null, { params: { borrower, due_date: dueDate, notes } }),
    returnLoan: (id: string, notes?: string) =>
        api.post(`/items/${id}/return-loan`, null, { params: { notes } }),
    listLent: () => api.get('/items/lent/all'),
    // Lost items
    listLost: () => api.get('/items/lost/all'),
    markLost: (id: string, notes?: string) => api.post(`/items/${id}/lost`, null, { params: { notes } }),
    markFound: (id: string, notes?: string) => api.post(`/items/${id}/found`, null, { params: { notes } }),
};

// Search API
export const searchApi = {
    search: (query: string) => api.get('/search', { params: { q: query } }),
    searchByAlias: (alias: string) => api.get(`/search/alias/${alias}`),
};

// QR API
export interface QrPdfOptions {
    qr_size?: number;
    page_size?: 'letter' | 'a4';
    orientation?: 'portrait' | 'landscape';
    columns?: number;
    show_labels?: boolean;
    label_font_size?: number;
    include_border?: boolean;
    include_id?: boolean;
}

export const qrApi = {
    getQrUrl: (locationId: string, size = 200) =>
        `${API_BASE_URL}/api/qr/${locationId}?size=${size}`,
    getItemQrUrl: (itemId: string, size = 200) =>
        `${API_BASE_URL}/api/qr/item/${itemId}?size=${size}`,
    getItemSequenceQrUrl: (itemId: string, seq: number, total: number, size = 150) =>
        `${API_BASE_URL}/api/qr/item/${itemId}?size=${size}&seq=${seq}&of=${total}`,
    getBulkPdfUrl: (type: 'locations' | 'items', ids: string[], options?: QrPdfOptions) => {
        const params = new URLSearchParams();
        params.set('type', type);
        params.set('ids', ids.join(','));
        if (options) {
            if (options.qr_size !== undefined) params.set('qr_size', String(options.qr_size));
            if (options.page_size) params.set('page_size', options.page_size);
            if (options.orientation) params.set('orientation', options.orientation);
            if (options.columns !== undefined) params.set('columns', String(options.columns));
            if (options.show_labels !== undefined) params.set('show_labels', String(options.show_labels));
            if (options.label_font_size !== undefined) params.set('label_font_size', String(options.label_font_size));
            if (options.include_border !== undefined) params.set('include_border', String(options.include_border));
            if (options.include_id !== undefined) params.set('include_id', String(options.include_id));
        }
        return `${API_BASE_URL}/api/qr/bulk-pdf?${params.toString()}`;
    },
    scanQr: (qrCodeId: string) => api.get(`/qr/scan/${qrCodeId}`),
};

// Wardrobe API - Full CRUD + Laundry + Outfits
export const wardrobeApi = {
    // Clothing items
    list: () => api.get('/wardrobe/items'),
    stats: () => api.get('/wardrobe/stats'),
    get: (id: string) => api.get(`/wardrobe/items/${id}`),
    create: (data: any) => api.post('/wardrobe/items', data),
    update: (id: string, data: any) => api.put(`/wardrobe/items/${id}`, data),
    delete: (id: string) => api.delete(`/wardrobe/items/${id}`),

    // Wear and laundry actions
    wear: (id: string) => api.post(`/wardrobe/items/${id}/wear`),
    wash: (id: string) => api.post(`/wardrobe/items/${id}/wash`),
    laundry: (id: string) => api.post(`/wardrobe/items/${id}/to-laundry`),
    moveToWornBasket: (id: string) => api.post(`/wardrobe/items/${id}/to-worn-basket`),

    // Laundry views
    getLaundryItems: () => api.get('/wardrobe/laundry'),
    getRewearSafeItems: () => api.get('/wardrobe/rewear-safe'),

    // Outfits
    listOutfits: () => api.get('/wardrobe/outfits'),
    getOutfit: (id: string) => api.get(`/wardrobe/outfits/${id}`),
    createOutfit: (data: any) => api.post('/wardrobe/outfits', data),
    updateOutfit: (id: string, data: any) => api.put(`/wardrobe/outfits/${id}`, data),
    deleteOutfit: (id: string) => api.delete(`/wardrobe/outfits/${id}`),
    wearOutfit: (id: string) => api.post(`/wardrobe/outfits/${id}/wear`),
};

// Export & Import API
export const exportApi = {
    exportFull: () => api.get('/export/full'),
    exportSummary: () => api.get('/export/summary'),
    exportArchive: () => api.get('/export/archive', { responseType: 'blob', timeout: 120000 }),
    importArchive: (fileUri: string, fileName: string) => {
        const formData = new FormData();
        formData.append('file', {
            uri: fileUri,
            type: 'application/zip',
            name: fileName || 'backup.zip',
        } as any);
        return api.post('/export/import/archive?confirm_replace=true', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
        });
    },
};

// Image API
export const imageApi = {
    upload: async (photo: any) => {
        const formData = new FormData();
        formData.append('file', {
            uri: photo.uri,
            type: photo.type || 'image/jpeg',
            name: photo.fileName || 'upload.jpg',
        } as any);

        return api.post('/images/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// Chat API
export const chatApi = {
    send: (message: string, conversationId?: string, imageBase64?: string) =>
        api.post('/chat', { message, conversation_id: conversationId, image_base64: imageBase64 }),
    clearHistory: (conversationId: string) =>
        api.delete(`/chat/history/${conversationId}`),

    // Ollama management
    getOllamaPresets: () => api.get('/chat/ollama/presets'),
    pullOllamaModel: (model: string) => api.post('/chat/ollama/pull', { model }),
    ollamaModels: () => api.get('/chat/ollama/models'),
    switchModel: (model: string) => api.patch('/chat/model', { model }),
};

// Voice Agent API
export const voiceApi = {
    transcribe: async (audioUri: string, mimeType: string = 'audio/m4a', fileName: string = 'audio.m4a') => {
        const formData = new FormData();
        formData.append('file', {
            uri: audioUri,
            type: mimeType,
            name: fileName,
        } as any);

        return api.post('/voice/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // Transcription might take a few seconds
        });
    }
};

// --- Connection Diagnostics ---
import { Platform } from 'react-native';

// Try to import NetInfo for WiFi detection (optional dependency)
let NetInfo: any = null;
try {
    NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
    // Not installed — WiFi check will be skipped
}

export interface ConnectionDiagnosis {
    ok: boolean;
    latencyMs?: number;
    serverInfo?: { app: string; version: string; hostname: string };
    error?: string;
    diagnosis: string;
    code: 'success' | 'no_wifi' | 'timeout' | 'refused' | 'dns' | 'network' | 'http_error' | 'invalid_url' | 'unknown';
}

/**
 * Check if the device has WiFi / network connectivity.
 * Returns null if NetInfo is not installed.
 */
async function checkNetworkState(): Promise<{ isConnected: boolean; type: string } | null> {
    if (!NetInfo) return null;
    try {
        const state = await NetInfo.fetch();
        return {
            isConnected: state.isConnected ?? false,
            type: state.type ?? 'unknown',
        };
    } catch {
        return null;
    }
}

/**
 * Classify a connection error into a user-friendly diagnosis.
 */
export function diagnoseConnectionError(error: any, url: string, isCellular: boolean = false): { diagnosis: string; code: ConnectionDiagnosis['code'] } {
    const msg = (error?.message || '').toLowerCase();
    const code = error?.code || '';

    // Timeout
    if (code === 'ECONNABORTED' || msg.includes('timeout')) {
        return {
            diagnosis: isCellular
                ? `⏱️ Connection timed out. Note: You are on cellular data. If "${url}" is a local server, you must be on the same WiFi network.`
                : `⏱️ Connection timed out. The server at ${url} didn't respond within 5 seconds. Make sure the desktop app is running and both devices are on the same network.`,
            code: 'timeout',
        };
    }

    // Connection refused
    if (code === 'ECONNREFUSED' || msg.includes('connection refused') || msg.includes('econnrefused')) {
        return {
            diagnosis: `🚫 Connection refused. The server at ${url} is not running or the port is blocked. Start the desktop app and try again.`,
            code: 'refused',
        };
    }

    // DNS / hostname resolution
    if (msg.includes('getaddrinfo') || msg.includes('enotfound') || msg.includes('could not resolve')) {
        return {
            diagnosis: `🔍 Could not resolve the server address. Check that the URL "${url}" is correct and the hostname exists on your network.`,
            code: 'dns',
        };
    }

    // Generic network error (covers ERR_NETWORK, etc.)
    if (code === 'ERR_NETWORK' || msg.includes('network error') || msg.includes('network request failed')) {
        return {
            diagnosis: isCellular
                ? `❌ Network error. Note: You are on cellular data. Local network addresses (like 192.168.x.x) are not reachable unless you are connected to the same WiFi.`
                : `❌ Network error. Ensure your phone and desktop are on the same WiFi network and the URL "${url}" is correct.`,
            code: 'network',
        };
    }

    // HTTP response but non-2xx
    if (error?.response) {
        const status = error.response.status;
        return {
            diagnosis: `⚠️ Server responded with HTTP ${status}. It may be misconfigured or running a different application.`,
            code: 'http_error',
        };
    }

    // Fallback
    return {
        diagnosis: `❓ Connection failed: ${error?.message || 'Unknown error'}. Double-check the URL and make sure the server is running.`,
        code: 'unknown',
    };
}

/**
 * Perform a detailed connection test to the given URL.
 * Returns rich diagnostics including WiFi state, latency, server info, and
 * a user-friendly diagnosis message on failure.
 */
export async function testConnectionDetailed(url?: string): Promise<ConnectionDiagnosis> {
    const targetUrl = url || API_BASE_URL;

    // Validate URL format
    try {
        new URL(targetUrl);
    } catch {
        return {
            ok: false,
            diagnosis: `🔗 Invalid URL format: "${targetUrl}". Expected something like http://192.168.1.x:8000`,
            code: 'invalid_url',
        };
    }

    // Check WiFi / network state
    const netState = await checkNetworkState();
    if (netState && !netState.isConnected) {
        return {
            ok: false,
            diagnosis: `📶 No network connection. Please connect to the internet.`,
            code: 'no_wifi',
        };
    }

    // We no longer block cellular connections because the user might be 
    // trying to reach a public server or using a VPN. 
    const isCellular = netState?.type === 'cellular';

    // Attempt the health check
    const start = Date.now();
    try {
        const res = await axios.get(`${targetUrl}/health`, {
            timeout: 5000,
            headers: { 'X-Device-Name': deviceName }
        });
        const latencyMs = Date.now() - start;
        const data = res.data;

        return {
            ok: true,
            latencyMs,
            serverInfo: {
                app: data.app || 'Unknown',
                version: data.version || '?',
                hostname: data.hostname || '?',
            },
            diagnosis: `✅ Connected to ${data.app || 'server'} (${data.hostname || targetUrl}) in ${latencyMs}ms`,
            code: 'success',
        };
    } catch (error: any) {
        const { diagnosis, code } = diagnoseConnectionError(error, targetUrl, isCellular);
        return {
            ok: false,
            error: error?.message,
            diagnosis,
            code,
        };
    }
}

// Backend health check (used in settings connection test)
export const testBackend = () => axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });

// Silent background ping to keep active_clients list fresh on the server
export const pingServer = (url?: string) => {
    const targetUrl = url || API_BASE_URL;
    return axios.get(`${targetUrl}/health`, {
        timeout: 5000,
        headers: { 'X-Device-Name': deviceName }
    });
};

// Visual Lens / Identify API
export const identifyApi = {
    // Identify an item from a photo
    identify: (photo: any) => {
        const formData = new FormData();
        formData.append('file', {
            uri: photo.uri,
            type: photo.type || 'image/jpeg',
            name: photo.fileName || 'capture.jpg',
        } as any);
        return api.post('/identify', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
    },

    // Enroll an item with a reference image
    enroll: (itemId: string, photo: any, autoTag?: boolean) => {
        const formData = new FormData();
        formData.append('file', {
            uri: photo.uri,
            type: photo.type || 'image/jpeg',
            name: photo.fileName || 'reference.jpg',
        } as any);

        const url = `/identify/enroll/${itemId}` + (autoTag ? '?auto_tag=true' : '');

        return api.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
    },

    // Remove enrollment for an item
    unenroll: (itemId: string) => api.delete(`/identify/enroll/${itemId}`),

    // Check model status and enrollment count
    status: () => api.get('/identify/status'),
};

// Analytics API
export const analyticsApi = {
    logWear: (itemId: string) => api.post(`/analytics/wear/${itemId}`),
    getCostPerWear: () => api.get('/analytics/cost-per-wear'),
    getDeclutter: (days: number = 365) => api.get(`/analytics/declutter?days=${days}`),
};

// Trips API
export const tripsApi = {
    list: () => api.get('/trips'),
    create: (data: any) => api.post('/trips', data),
    get: (id: string) => api.get(`/trips/${id}`),
    pack: (tripId: string, itemId: string) => api.post(`/trips/${tripId}/pack/${itemId}`),
    unpack: (tripId: string, itemId: string) => api.post(`/trips/${tripId}/unpack/${itemId}`),
    unpackAll: (tripId: string) => api.post(`/trips/${tripId}/unpack-all`),
    markInactive: (tripId: string) => api.post(`/trips/${tripId}/inactive`),
};

export default api;


