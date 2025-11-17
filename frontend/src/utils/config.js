
// API Configuration
export const API_URL = 'http://192.168.100.171:3005';
// export const API_URL = 'https://mimascotaplus.com/api';

// Endpoints
export const ENDPOINTS = {
  // Auth
  USER_REGISTER: '/auth/user/register',
  USER_LOGIN: '/auth/user/login',
  VET_REGISTER: '/auth/vet/register',
  VET_LOGIN: '/auth/vet/login',

  // Pets
  PETS: '/pets',
  PET_BY_ID: (id) => `/pets/${id}`,

  // Vaccines
  PET_VACCINES: (petId) => `/pets/${petId}/vaccines`,
  VACCINE_BY_ID: (id) => `/pets/vaccines/${id}`,

  // Procedures
  PET_PROCEDURES: (petId) => `/pets/${petId}/procedures`,
  PROCEDURE_BY_ID: (id) => `/pets/procedures/${id}`,
};

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  USER_TYPE: 'user_type',
};
