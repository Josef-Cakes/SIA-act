// src/features/auth/authService.js
// All API calls go through Spring Boot - React NEVER calls Supabase directly.

import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// =============================================
// AUTH APIS
// =============================================

/**
 * Register a new user.
 * POST /api/register
 * @param {Object} userData - { username, email, password, fullName, phone }
 * @returns {Promise<ApiResponse<UserResponse>>}
 */
export const registerUser = async (userData) => {
  const response = await api.post('/register', userData);
  return response.data;
};

/**
 * Log in an existing user.
 * POST /api/login
 * @param {Object} credentials - { email, password }
 * @returns {Promise<ApiResponse<UserResponse>>}
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

// =============================================
// USER PROFILE APIS
// =============================================

/**
 * Get user profile by ID.
 * GET /api/user/profile/:userId
 */
export const getProfile = async (userId) => {
  const response = await api.get(`/user/profile/${userId}`);
  return response.data;
};

/**
 * Update user profile.
 * PUT /api/user/profile/:userId
 * @param {number} userId
 * @param {Object} profileData - { username, email, fullName, phone }
 */
export const updateProfile = async (userId, profileData) => {
  const response = await api.put(`/user/profile/${userId}`, profileData);
  return response.data;
};

/**
 * Change user password.
 * PUT /api/user/password/:userId
 * @param {number} userId
 * @param {Object} passwordData - { currentPassword, newPassword, confirmPassword }
 */
export const updatePassword = async (userId, passwordData) => {
  const response = await api.put(`/user/password/${userId}`, passwordData);
  return response.data;
};

/**
 * Upload profile photo.
 * POST /api/user/photo/:userId
 * @param {number} userId
 * @param {File} imageFile - JPG or PNG file
 */
export const uploadProfilePhoto = async (userId, imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const session = getUserSession();
  const response = await api.post(`/user/photo/${userId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-User-Id': String(session?.id ?? ''),
    },
  });
  return response.data;
};

/**
 * Get profile photo URL (served by Spring Boot from BLOB).
 * @param {number} userId
 */
export const getProfilePhotoUrl = (userId) => {
  return `${BASE_URL}/user/photo/${userId}`;
};

// =============================================
// SESSION HELPERS (localStorage-based, no JWT)
// =============================================

export const saveUserSession = (user) => {
  const serialized = JSON.stringify(user);
  localStorage.setItem('authUser', serialized);
  localStorage.setItem('user_data', serialized);
};

export const getUserSession = () => {
  const stored = localStorage.getItem('user_data') || localStorage.getItem('authUser');
  return stored ? JSON.parse(stored) : null;
};

export const clearUserSession = () => {
  localStorage.removeItem('authUser');
  localStorage.removeItem('user_data');
};

export default api;
