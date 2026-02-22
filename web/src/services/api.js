import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Electron support: Dynamic base URL
let electronBaseUrl = null;
if (window.electron) {
    api.interceptors.request.use(async (config) => {
        if (!electronBaseUrl) {
            try {
                electronBaseUrl = await window.electron.getApiUrl();
            } catch (error) {
                console.error('Failed to get Electron API URL:', error);
            }
        }
        if (electronBaseUrl) {
            config.baseURL = `${electronBaseUrl}/api`;
        }
        return config;
    });
}

// Location API
export const locationApi = {
    list: () => api.get('/locations'),
    getTree: () => api.get('/locations/tree'),
    get: (id) => api.get(`/locations/${id}`),
    getLocationTree: (id) => api.get(`/locations/${id}/tree`),
    create: (data) => api.post('/locations', data),
    update: (id, data) => api.put(`/locations/${id}`, data),
    delete: (id) => api.delete(`/locations/${id}`),
    addAlias: (id, alias) => api.post(`/locations/${id}/alias`, { alias }),
    removeAlias: (id, alias) => api.delete(`/locations/${id}/alias/${alias}`),
};

// Item API
export const itemApi = {
    list: (params) => api.get('/items', { params }),
    get: (id) => api.get(`/items/${id}`),
    create: (data) => api.post('/items', data),
    update: (id, data) => api.put(`/items/${id}`, data),
    delete: (id) => api.delete(`/items/${id}`),
    move: (id, data) => api.post(`/items/${id}/move`, data),
    return: (id) => api.post(`/items/${id}/return`),
    getHistory: (id) => api.get(`/items/${id}/history`),
    // Loan tracking
    lend: (id, borrower, dueDate, notes) => api.post(`/items/${id}/lend`, null, {
        params: { borrower, due_date: dueDate, notes }
    }),
    returnLoan: (id, notes) => api.post(`/items/${id}/return-loan`, null, { params: { notes } }),
    listLent: () => api.get('/items/lent/all'),
    // Lost items
    listLost: () => api.get('/items/lost/all'),
    markLost: (id, notes) => api.post(`/items/${id}/lost`, null, { params: { notes } }),
    markFound: (id, notes) => api.post(`/items/${id}/found`, null, { params: { notes } }),
};

// Search API
export const searchApi = {
    search: (query) => api.get('/search', { params: { q: query } }),
    searchByAlias: (alias) => api.get(`/search/alias/${alias}`),
};

// Helper to get the correct base URL (Electron-aware)
const getBaseUrl = () => electronBaseUrl || API_BASE_URL;

// QR API
export const qrApi = {
    getQrUrl: (locationId, size = 200) =>
        `${getBaseUrl()}/api/qr/${locationId}?size=${size}`,
    getItemQrUrl: (itemId, size = 200) =>
        `${getBaseUrl()}/api/qr/item/${itemId}?size=${size}`,
    getItemSequenceQrUrl: (itemId, seq, total, size = 150) =>
        `${getBaseUrl()}/api/qr/item/${itemId}?size=${size}&seq=${seq}&of=${total}`,
    getBulkPdfUrl: (type, ids) =>
        `${getBaseUrl()}/api/qr/bulk-pdf?type=${type}&ids=${ids.join(',')}`,
    scanQr: (qrCodeId) => api.get(`/qr/scan/${qrCodeId}`),
};

// Export & Import API
export const exportApi = {
    exportFull: () => api.get('/export/full'),
    exportSummary: () => api.get('/export/summary'),
    exportArchive: () => api.get('/export/archive', { responseType: 'blob', timeout: 120000 }),
    importArchive: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/export/import/archive?confirm_replace=true', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
        });
    },
};

// Wardrobe API
export const wardrobeApi = {
    // Clothing items
    listClothing: (params) => api.get('/wardrobe/items', { params }),
    getClothingItem: (id) => api.get(`/wardrobe/items/${id}`),
    createClothingItem: (data) => api.post('/wardrobe/items', data),
    updateClothingItem: (id, data) => api.put(`/wardrobe/items/${id}`, data),

    // Wear and laundry
    wearItem: (id) => api.post(`/wardrobe/items/${id}/wear`),
    washItem: (id) => api.post(`/wardrobe/items/${id}/wash`),
    moveToLaundry: (id) => api.post(`/wardrobe/items/${id}/to-laundry`),
    moveToWornBasket: (id) => api.post(`/wardrobe/items/${id}/to-worn-basket`),
    getLaundryItems: () => api.get('/wardrobe/laundry'),
    getRewearSafeItems: () => api.get('/wardrobe/rewear-safe'),

    // Outfits
    listOutfits: () => api.get('/wardrobe/outfits'),
    getOutfit: (id) => api.get(`/wardrobe/outfits/${id}`),
    createOutfit: (data) => api.post('/wardrobe/outfits', data),
    updateOutfit: (id, data) => api.put(`/wardrobe/outfits/${id}`, data),
    deleteOutfit: (id) => api.delete(`/wardrobe/outfits/${id}`),
    wearOutfit: (id) => api.post(`/wardrobe/outfits/${id}/wear`),

    // Stats
    getStats: () => api.get('/wardrobe/stats'),
};

// Image API
export const imageApi = {
    upload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// Chat API
export const chatApi = {
    send: (message, conversationId) =>
        api.post('/chat', { message, conversation_id: conversationId }),
    clearHistory: (conversationId) =>
        api.delete(`/chat/history/${conversationId}`),
};

// Visual Lens / Identify API
export const identifyApi = {
    // Identify an item from a photo
    identify: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/identify', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
    },

    // Enroll an item with a reference image
    enroll: (itemId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/identify/enroll/${itemId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
    },

    // Remove enrollment
    unenroll: (itemId) => api.delete(`/identify/enroll/${itemId}`),

    // Status
    status: () => api.get('/identify/status'),

    // Model management
    listModels: () => api.get('/identify/models'),
    catalog: () => api.get('/identify/models/catalog'),
    downloadModel: (url, filename) =>
        api.post('/identify/models/download', null, { params: { url, filename } }),
    uploadModel: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/identify/models/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
        });
    },
    activateModel: (filename) => api.post(`/identify/models/${filename}/activate`),
    deleteModel: (filename) => api.delete(`/identify/models/${filename}`),
};

export default api;

