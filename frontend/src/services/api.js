import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../utils/config';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_TYPE);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  registerUser: (data) => api.post('/auth/user/register', data),
  loginUser: (data) => api.post('/auth/user/login', data),
  registerVet: (data) => api.post('/auth/vet/register', data),
  loginVet: (data) => api.post('/auth/vet/login', data),
};

// Pets API
export const petsAPI = {
  getAll: () => api.get('/pets'),
  getArchived: () => api.get('/pets/archived/list'),
  getById: (id) => api.get(`/pets/${id}`),
  create: (formData) => {
    return api.post('/pets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, formData) => {
    return api.put(`/pets/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/pets/${id}`),
  getLinkCode: (id) => api.get(`/pets/${id}/link-code`),
  linkPet: (linkCode) => api.post('/pets/link', { linkCode }),
  unlinkPet: (id) => api.delete(`/pets/${id}/unlink`),
  archive: (id, archived) => api.patch(`/pets/${id}/archive`, { archived }),
};

// Vaccines API
export const vaccinesAPI = {
  getByPetId: (petId) => api.get(`/pets/${petId}/vaccines`),
  create: (petId, formData) => {
    return api.post(`/pets/${petId}/vaccines`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => api.put(`/pets/vaccines/${id}`, data),
};

// Procedures API
export const proceduresAPI = {
  getByPetId: (petId) => api.get(`/pets/${petId}/procedures`),
  create: (petId, formData) => {
    return api.post(`/pets/${petId}/procedures`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => api.put(`/pets/procedures/${id}`, data),
  delete: (id) => api.delete(`/pets/procedures/${id}`),
};

export default api;
