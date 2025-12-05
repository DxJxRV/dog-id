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
  appleLogin: (data) => api.post('/auth/user/apple', data),
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
  search: (query) => api.get(`/pets/search?q=${encodeURIComponent(query)}`),
};

// Search API (Global)
export const searchAPI = {
  globalSearch: (query) => api.get(`/search?q=${encodeURIComponent(query)}`),
  getDiscovery: () => api.get('/search/discovery'),
};

// User API (Booking & Favorites)
export const userAPI = {
  getBookingHome: () => api.get('/users/booking-home'),
  toggleFavorite: (data) => api.post('/users/favorites', data),
  checkFavorite: (params) => api.get('/users/favorites/check', { params }),
  getNotifications: () => api.get('/user/notifications'),
  getMyVets: () => api.get('/users/booking-home'), // Reutilizar endpoint que devuelve vets
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
  completeDraft: (id, formData) => {
    return api.put(`/pets/vaccines/${id}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDraft: (id) => api.delete(`/pets/vaccines/${id}/draft`),
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
  completeDraft: (id, formData) => {
    return api.put(`/pets/procedures/${id}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDraft: (id) => api.delete(`/pets/procedures/${id}/draft`),
};

// Drafts API (Bitácora Inteligente)
export const draftsAPI = {
  getDrafts: (petId) => api.get(`/pets/${petId}/drafts`),
  getAllVetDrafts: () => api.get('/pets/vet/drafts/all'), // Obtener TODOS los drafts del veterinario
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

// Clinic API (SaaS)
export const clinicAPI = {
  createDefault: () => api.post('/clinics/default'),
  create: (data) => api.post('/clinics', data),
  getMyClinics: () => api.get('/clinics/my'),
  addMember: (data) => api.post('/clinics/members', data),
  update: (id, data) => api.put(`/clinics/${id}`, data),
  getStaff: (id) => api.get(`/clinics/${id}/staff`),
  addStaffMember: (id, data) => api.post(`/clinics/${id}/staff`, data), // Legacy
  inviteMember: (id, data) => api.post(`/clinics/${id}/invite`, data), // New
  toggleAvailability: (id, data) => api.post(`/clinics/${id}/availability`, data),
  getMyInvitations: () => api.get('/vets/invitations'),
  manageInvitation: (id, action) => api.post(`/clinics/invitations/${id}/manage`, { action }),
  uploadLogo: async (id, imageUri) => {
    const formData = new FormData();
    formData.append('logo', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'logo.jpg',
    });
    return api.put(`/clinics/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Appointment API (SaaS)
export const appointmentAPI = {
  create: (data) => api.post('/appointments', data),
  getSchedule: (params) => api.get('/appointments', { params }),
  updateStatus: (id, status) => api.put(`/appointments/${id}/status`, { status }),
  getDetail: (id) => api.get(`/appointments/${id}`),
  request: (data) => api.post('/appointments/request', data),
  getPendingRequests: () => api.get('/appointments/requests'),
  manageRequest: (id, action, vetId) => api.post(`/appointments/${id}/manage`, { action, vetId }),
  getSlots: (vetId, date) => api.get(`/vets/${vetId}/slots?date=${date}`),
  assignAndConfirm: (id, data) => api.post(`/appointments/${id}/assign-confirm`, data),
};

// Prescription API (Live Consultation)
export const prescriptionAPI = {
  createOrGet: (appointmentId) => api.post(`/appointments/${appointmentId}/prescription`),
  getOrCreateByAppointment: (appointmentId) => api.post(`/appointments/${appointmentId}/prescription`),
  get: (id) => api.get(`/prescriptions/${id}`),
  addMedication: (id, data) => api.post(`/prescriptions/${id}/items`, data),
  addMedicationsBatch: (id, medications) => api.post(`/prescriptions/${id}/items/batch`, { medications }),
  updateMedication: (itemId, data) => api.put(`/prescriptions/items/${itemId}`, data),
  removeMedication: (itemId) => api.delete(`/prescriptions/items/${itemId}`),
  updateDetails: (id, data) => api.put(`/prescriptions/${id}`, data),
  finalize: (id, data) => api.post(`/prescriptions/${id}/finalize`, data),
  regenerate: (id, data) => api.put(`/prescriptions/${id}/regenerate`, data), // Update finalized prescription and regenerate PDF
  getOwnerPrescriptions: () => api.get('/owner/prescriptions'), // Get all prescriptions for owner's pets
  getOwnerDashboard: () => api.get('/owner/dashboard'), // Get dashboard summary for owner
};

// Public API (No auth required)
export const publicAPI = {
  getPrescriptionByToken: (token) => axios.get(`${API_URL}/public/prescription/${token}`),
  getPrescriptionPdfByToken: (token) => `${API_URL}/public/prescription/${token}/pdf`,
};

// Medication Logs API
export const medicationLogAPI = {
  logMedication: (data) => api.post('/medication-logs', data), // Toggle medication log
  getTodayLogs: () => api.get('/medication-logs/today'), // Get today's logs
  getPetAdherence: (petId, params) => api.get(`/pets/${petId}/adherence`, { params }), // Get adherence data
};

export default api;
