import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('[API Error]', error.response?.data || error.message);
    return Promise.reject(error.response?.data || error);
  }
);

// Search API
export const searchAPI = {
  search: (params: Record<string, any>) => 
    apiClient.get('/search', { params }),
  
  getSuggestions: (prefix: string, limit = 10) =>
    apiClient.get('/search/suggestions', { params: { prefix, limit } }),
  
  getStats: () =>
    apiClient.get('/search/stats'),
};

// Files API
export const filesAPI = {
  list: (params: Record<string, any> = {}) =>
    apiClient.get('/files', { params }),
  
  getById: (id: string) =>
    apiClient.get(`/files/${id}`),
  
  create: (data: Record<string, any>) =>
    apiClient.post('/files', data),
  
  updateTags: (id: string, tags: Record<string, boolean>) =>
    apiClient.put(`/files/${id}/tags`, { tags }),
  
  delete: (id: string) =>
    apiClient.delete(`/files/${id}`),
  
  getUploadUrl: (fileName: string, mimeType: string) =>
    apiClient.post('/files/upload-url', { fileName, mimeType }),
  
  getDownloadUrl: (id: string) =>
    apiClient.get(`/files/${id}/download-url`),
};

export default apiClient;
