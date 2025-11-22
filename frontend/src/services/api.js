import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../utils/config';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 7000,
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
  login: (data) => api.post('/auth/login', data), // Login unificado
  registerUser: (data) => api.post('/auth/user/register', data),
  loginUser: (data) => api.post('/auth/user/login', data),
  googleLogin: (data) => api.post('/auth/user/google', data),
  registerVet: (data) => api.post('/auth/vet/register', data),
  loginVet: (data) => api.post('/auth/vet/login', data),
  updateProfilePhoto: (formData) => {
    return api.put('/auth/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateCoverPhoto: (formData) => {
    return api.put('/auth/profile/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateProfile: (data) => api.put('/auth/profile', data),
  deleteAccount: () => api.delete('/auth/profile'),
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
  createQuickPet: (formData) => {
    return api.post('/pets/quick-create', formData, {
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
  getTransferCode: (id) => api.get(`/pets/${id}/transfer-code`),
  linkPet: (linkCode) => api.post('/pets/link', { linkCode }),
  claimPet: (transferCode) => api.post('/pets/claim', { transferCode }),
  unlinkPetAsVet: (id) => api.delete(`/pets/${id}/unlink-vet`),
  unlinkPetAsCoOwner: (id) => api.delete(`/pets/${id}/unlink-coowner`),
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

// Friendships API
export const friendshipsAPI = {
  getFriendCode: () => api.get('/friendships/friend-code'),
  sendRequest: (friendCode) => api.post('/friendships/send-request', { friendCode }),
  getPending: () => api.get('/friendships/pending'),
  accept: (requestId) => api.post(`/friendships/accept/${requestId}`),
  reject: (requestId) => api.post(`/friendships/reject/${requestId}`),
  getFriends: () => api.get('/friendships/friends'),
  remove: (friendshipId) => api.delete(`/friendships/friends/${friendshipId}`),
  getFriendsPets: () => api.get('/friendships/friends/pets'),
  getNewPetsCount: () => api.get('/friendships/friends/new-pets-count'),
  markPetsViewed: () => api.post('/friendships/friends/mark-viewed'),
};

// Medical Data API (ECE)
export const medicalDataAPI = {
  create: (procedureId, data) => api.post(`/procedures/${procedureId}/medical-data`, data),
  getMedicalHistory: (petId) => api.get(`/pets/${petId}/medical-history`),
  getWeightEvolution: (petId) => api.get(`/pets/${petId}/evolution/weight`),
};

// Consent API (ECE)
export const consentAPI = {
  createProcedureConsent: (procedureId, data) => api.post(`/consents/procedure/${procedureId}`, data),
  createVaccineConsent: (vaccineId, data) => api.post(`/consents/vaccine/${vaccineId}`, data),
  getConsent: (id) => api.get(`/consents/${id}`),
  getLegalTexts: () => api.get('/legal-texts'),
};

// Death Certificate API (ECE)
export const deathCertificateAPI = {
  create: (data) => api.post('/death-certificates', data),
  getByPetId: (petId) => api.get(`/pets/${petId}/death-certificate`),
};

export default api;
