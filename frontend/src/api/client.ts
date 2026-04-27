import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Logs
apiClient.interceptors.request.use(
  (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.response?.data || error.message);
    return Promise.reject(error.response?.data || error);
  }
);

// ----------------------------
// SEARCH API
// ----------------------------
export const searchAPI = {
  search: (query: string) =>
    apiClient.get('/search', { params: { q: query } }),

  getStats: () =>
    apiClient.get('/search/stats'),
};

// ----------------------------
// FILES API (FIXED VERSION)
// ----------------------------
export const filesAPI = {
  getUploadUrl: (fileName: string, mimeType: string) =>
    apiClient.post('/files/upload-url', { fileName, mimeType }),

  create: (data: any) =>
    apiClient.post('/files', data),

  getDownloadUrl: (id: string) =>
    apiClient.get(`/files/${id}/download-url`),

  // ✔ Missing functions (Added)
  list: (params?: any) =>
    apiClient.get('/files', { params }),

  getById: (id: string) =>
    apiClient.get(`/files/${id}`),

  delete: (id: string) =>
    apiClient.delete(`/files/${id}`),

  updateTags: (id: string, tags: Record<string, boolean>) =>
    apiClient.put(`/files/${id}/tags`, { tags }),
};

export default apiClient;