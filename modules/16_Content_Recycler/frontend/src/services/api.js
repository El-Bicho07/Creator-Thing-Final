import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Interceptor to add JWT token if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  demoLogin: () => api.post('/auth/demo-login'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const postsAPI = {
  getPosts: (params) => api.get('/posts', { params }),
  getPostById: (id) => api.get(`/posts/${id}`),
  deletePost: (id) => api.delete(`/posts/${id}`),
  seedDemo: (force = false) => api.post(`/posts/seed-demo?force=${force}`),
  clearAll: () => api.delete('/posts/clear'),
  getStats: () => api.get('/posts/stats'),
};

export const importAPI = {
  previewCSV: (formDataOrString) => {
    if (formDataOrString instanceof FormData) {
      return api.post('/import/preview', formDataOrString, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/import/preview', { csvString: formDataOrString });
  },
  commitImport: (records, skipDuplicates = true) => 
    api.post('/import/commit', { records, skipDuplicates }),
  getSampleCSVUrl: () => '/api/import/sample',
};

export const recommendationsAPI = {
  getAll: (params) => api.get('/recommendations', { params }),
  getPostDetail: (id) => api.get(`/recommendations/post/${id}`),
};

export const similarityAPI = {
  getAnalysis: (threshold = 0.28) => api.get(`/similarity?threshold=${threshold}`),
  getSimilarToPost: (id) => api.get(`/similarity/post/${id}`),
};

export const plannerAPI = {
  getItems: (params) => api.get('/planner', { params }),
  createItem: (data) => api.post('/planner', data),
  updateItem: (id, data) => api.put(`/planner/${id}`, data),
  deleteItem: (id) => api.delete(`/planner/${id}`),
  clearAll: () => api.delete('/planner/clear'),
};

export const systemAPI = {
  healthCheck: () => api.get('/health'),
};

export default api;
