import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request log
apiClient.interceptors.request.use(
  (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response log (DO NOT MODIFY STRUCTURE)
apiClient.interceptors.response.use(
  (response) => response, // ✅ keep full response
  (error) => {
    console.error('[API Error]', error.response?.data || error.message);
    return Promise.reject(error.response?.data || error);
  }
);

export const filesAPI = {
  getUploadUrl: (fileName: string, mimeType: string) =>
    apiClient.post('/files/upload-url', { fileName, mimeType }),

  create: (data: any) =>
    apiClient.post('/files', data),

  getDownloadUrl: (id: string) =>
    apiClient.get(`/files/${id}/download-url`),
};

export const searchAPI = {
  search: (params: Record<string, any>) =>
    apiClient.get('/search', { params }),

  getSuggestions: (prefix: string, limit = 10) =>
    apiClient.get('/search/suggestions', { params: { prefix, limit } }),

  getStats: () =>
    apiClient.get('/search/stats'),
}; 

export default apiClient;