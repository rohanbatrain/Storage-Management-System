import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
};

// Search API
export const searchApi = {
    search: (query) => api.get('/search', { params: { q: query } }),
    searchByAlias: (alias) => api.get(`/search/alias/${alias}`),
};

// QR API
export const qrApi = {
    getQrUrl: (locationId, size = 200) =>
        `${API_BASE_URL}/api/qr/${locationId}?size=${size}`,
    getItemQrUrl: (itemId, size = 200) =>
        `${API_BASE_URL}/api/qr/item/${itemId}?size=${size}`,
    getItemSequenceQrUrl: (itemId, seq, total, size = 150) =>
        `${API_BASE_URL}/api/qr/item/${itemId}?size=${size}&seq=${seq}&of=${total}`,
    getBulkPdfUrl: (type, ids) =>
        `${API_BASE_URL}/api/qr/bulk-pdf?type=${type}&ids=${ids.join(',')}`,
    scanQr: (qrCodeId) => api.get(`/qr/scan/${qrCodeId}`),
};

// Export API
export const exportApi = {
    exportFull: () => api.get('/export'),
    exportSummary: () => api.get('/export/summary'),
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

export default api;

