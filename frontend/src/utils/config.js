
// API Configuration
export const API_URL = 'http://192.168.100.171:3005';
// export const API_URL = 'https://mimascotaplus.com/api';

// Endpoints
export const ENDPOINTS = {
  // Auth
  USER_REGISTER: '/auth/user/register',
  USER_LOGIN: '/auth/user/login',
  USER_GOOGLE_LOGIN: '/auth/user/google',
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

// Google OAuth
export const GOOGLE_CLIENT_ID = '474914302160-n9ei7n4kgjeq94mr6l067t4hnj0jrcr9.apps.googleusercontent.com';
