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

// Location API - Full CRUD
export const locationApi = {
    list: () => api.get('/locations'),
    getTree: () => api.get('/locations/tree'),
    get: (id: string) => api.get(`/locations/${id}`),
    create: (data: any) => api.post('/locations', data),
    update: (id: string, data: any) => api.put(`/locations/${id}`, data),
    delete: (id: string) => api.delete(`/locations/${id}`),
};

// Item API - Full CRUD
export const itemApi = {
    list: (params?: any) => api.get('/items', { params }),
    get: (id: string) => api.get(`/items/${id}`),
    create: (data: any) => api.post('/items', data),
    update: (id: string, data: any) => api.put(`/items/${id}`, data),
    delete: (id: string) => api.delete(`/items/${id}`),
    move: (id: string, data: any) => api.post(`/items/${id}/move`, data),
    return: (id: string) => api.post(`/items/${id}/return`),
};

// Search API
export const searchApi = {
    search: (query: string) => api.get('/search', { params: { q: query } }),
};

// QR API
export const qrApi = {
    getQrUrl: (locationId: string, size = 200) =>
        `${API_BASE_URL}/api/qr/${locationId}?size=${size}`,
    scanQr: (qrCodeId: string) => api.get(`/qr/scan/${qrCodeId}`),
};

// Wardrobe API - Full CRUD
export const wardrobeApi = {
    list: () => api.get('/wardrobe/items'),
    stats: () => api.get('/wardrobe/stats'),
    get: (id: string) => api.get(`/wardrobe/items/${id}`),
    create: (data: any) => api.post('/wardrobe/items', data),
    update: (id: string, data: any) => api.put(`/wardrobe/items/${id}`, data),
    delete: (id: string) => api.delete(`/wardrobe/items/${id}`),
    wear: (id: string) => api.post(`/wardrobe/items/${id}/wear`),
    wash: (id: string) => api.post(`/wardrobe/items/${id}/wash`),
    laundry: (id: string) => api.post(`/wardrobe/items/${id}/to-laundry`),
};

export default api;

