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
    scanQr: (qrCodeId) => api.get(`/qr/scan/${qrCodeId}`),
};

export default api;
