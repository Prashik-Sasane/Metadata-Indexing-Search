import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

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
  search: (params: {
    prefix?: string;
    tag?: string;
    sizeMin?: number;
    sizeMax?: number;
    mimeType?: string;
    topK?: number;
    sort?: string;
  }) => apiClient.get('/search', { params }),

  getSuggestions: (prefix: string, limit: number = 10) =>
    apiClient.get('/search/suggestions', { params: { prefix, limit } }),

  getStats: () => apiClient.get('/search/stats'),
};

// ----------------------------
// FILES API
// ----------------------------
export const filesAPI = {
  // Direct multipart file upload
  upload: (file: File, tags?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (tags) formData.append('tags', tags);
    return apiClient.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  // Presigned URL flow
  getUploadUrl: (fileName: string, mimeType: string) =>
    apiClient.post('/files/upload-url', { fileName, mimeType }),

  create: (data: any) => apiClient.post('/files', data),

  getDownloadUrl: (id: string) =>
    apiClient.get(`/files/${id}/download-url`),

  list: (params?: any) => apiClient.get('/files', { params }),

  getById: (id: string) => apiClient.get(`/files/${id}`),

  delete: (id: string) => apiClient.delete(`/files/${id}`),

  updateTags: (id: string, tags: Record<string, boolean>) =>
    apiClient.put(`/files/${id}`, { tags }),
};

// ----------------------------
// CRAWLER API
// ----------------------------
export const crawlerAPI = {
  /** Start a crawl — returns the API base URL for SSE streaming */
  getCrawlUrl: () => `${API_BASE_URL}/crawler/crawl`,

  /** Get all crawled pages */
  getResults: () => apiClient.get('/crawler/results'),

  /** Clear all crawled pages */
  clearResults: () => apiClient.delete('/crawler/results'),
};

export default apiClient;