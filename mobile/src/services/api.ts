import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure this based on how you're running:
// Default to localhost for dev, but will be overwritten by context
let API_BASE_URL = 'http://192.168.1.4:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

let connectionErrorCallback: (() => void) | null = null;

// Load persisted URL on startup
AsyncStorage.getItem('@sms_api_url').then(url => {
    if (url) {
        setApiBaseUrl(url);
    }
});

export const setConnectionErrorCallback = (callback: () => void) => {
    connectionErrorCallback = callback;
};

export const setApiBaseUrl = (url: string) => {
    API_BASE_URL = url;
    api.defaults.baseURL = `${url}/api`;
    console.log('API Base URL set to:', api.defaults.baseURL);
};

export const saveApiBaseUrl = async (url: string) => {
    // Basic formatting: remove trailing slash, or add http if missing
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
    }
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = `http://${cleanUrl}`;
    }

    setApiBaseUrl(cleanUrl);
    await AsyncStorage.setItem('@sms_api_url', cleanUrl);
};

api.interceptors.response.use(
    response => response,
    error => {
        if (!error.response) {
            // Network error
            console.log('Network Error detected in API');
            if (connectionErrorCallback) connectionErrorCallback();
        }
        return Promise.reject(error);
    }
);


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
    send: (message: string, conversationId?: string) =>
        api.post('/chat', { message, conversation_id: conversationId }),
    clearHistory: (conversationId: string) =>
        api.delete(`/chat/history/${conversationId}`),
};

// Backend health check (used in settings connection test)
export const testBackend = () => api.get('/health', { timeout: 5000 });

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
    enroll: (itemId: string, photo: any) => {
        const formData = new FormData();
        formData.append('file', {
            uri: photo.uri,
            type: photo.type || 'image/jpeg',
            name: photo.fileName || 'reference.jpg',
        } as any);
        return api.post(`/identify/enroll/${itemId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
    },

    // Remove enrollment for an item
    unenroll: (itemId: string) => api.delete(`/identify/enroll/${itemId}`),

    // Check model status and enrollment count
    status: () => api.get('/identify/status'),

    // List installed models
    listModels: () => api.get('/identify/models'),

    // Get curated model catalog
    catalog: () => api.get('/identify/models/catalog'),
};

export default api;


