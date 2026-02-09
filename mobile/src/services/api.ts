import axios from 'axios';

// Configure this based on how you're running:
// - iOS Simulator: use 'localhost'
// - Android Emulator: use '10.0.2.2'
// - Physical device: use your Mac's local IP (run: ifconfig | grep "inet " | grep -v 127)
//
// Example: const API_BASE_URL = 'http://192.168.1.100:8000';
const API_BASE_URL = 'http://192.168.1.4:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Location API - Full CRUD + Aliases
export const locationApi = {
    list: () => api.get('/locations'),
    getTree: () => api.get('/locations/tree'),
    get: (id: string) => api.get(`/locations/${id}`),
    getLocationTree: (id: string) => api.get(`/locations/${id}/tree`),
    create: (data: any) => api.post('/locations', data),
    update: (id: string, data: any) => api.put(`/locations/${id}`, data),
    delete: (id: string) => api.delete(`/locations/${id}`),
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
};

// Search API
export const searchApi = {
    search: (query: string) => api.get('/search', { params: { q: query } }),
    searchByAlias: (alias: string) => api.get(`/search/alias/${alias}`),
};

// QR API
export const qrApi = {
    getQrUrl: (locationId: string, size = 200) =>
        `${API_BASE_URL}/api/qr/${locationId}?size=${size}`,
    getItemQrUrl: (itemId: string, size = 200) =>
        `${API_BASE_URL}/api/qr/item/${itemId}?size=${size}`,
    getItemSequenceQrUrl: (itemId: string, seq: number, total: number, size = 150) =>
        `${API_BASE_URL}/api/qr/item/${itemId}?size=${size}&seq=${seq}&of=${total}`,
    getBulkPdfUrl: (type: 'locations' | 'items', ids: string[]) =>
        `${API_BASE_URL}/api/qr/bulk-pdf?type=${type}&ids=${ids.join(',')}`,
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

// Export API
export const exportApi = {
    exportFull: () => api.get('/export/full'),
    exportSummary: () => api.get('/export/summary'),
};

export default api;


