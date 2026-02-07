import axios from 'axios';

// Configure this to your backend URL
// For local development with Android emulator, use 10.0.2.2 instead of localhost
const API_BASE_URL = 'http://10.0.2.2:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Location API
export const locationApi = {
    list: () => api.get('/locations'),
    getTree: () => api.get('/locations/tree'),
    get: (id: string) => api.get(`/locations/${id}`),
    create: (data: any) => api.post('/locations', data),
};

// Item API
export const itemApi = {
    list: (params?: any) => api.get('/items', { params }),
    get: (id: string) => api.get(`/items/${id}`),
    create: (data: any) => api.post('/items', data),
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

export default api;
