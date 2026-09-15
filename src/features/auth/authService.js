// src/features/auth/authService.js
// All API calls go through Spring Boot - React NEVER calls Supabase directly.

import axios from 'axios';
import { API_BASE_URL } from '../../config/env';

const BASE_URL = API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add JWT token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// The server is authoritative for session validity. Clear stale local state
// when a token is revoked, expired, or no longer grants the same role.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';
    const isAuthRequest = requestUrl.includes('/login') || requestUrl.includes('/register');
    if (status === 401 && !isAuthRequest && typeof window !== 'undefined') {
      clearUserSession();
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

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
 * Log in an existing user by username.
 * POST /api/login
 * @param {Object} credentials - { username, password }
 * @returns {Promise<ApiResponse<UserResponse>>} - Includes JWT token and role
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

/**
 * Get admin analytics summary.
 * GET /api/admin/analytics/summary
 */
export const getAdminAnalyticsSummary = async () => {
  const response = await api.get('/admin/analytics/summary');
  return response.data;
};

export const getAdminActivityFeed = async () => {
  const response = await api.get('/admin/activity-feed');
  return response.data;
};

export const getAdminHandlers = async () => {
  const response = await api.get('/logs/handlers');
  return response.data;
};

export const getAllActivityLogs = async ({ userId, limit = 20 } = {}) => {
  const response = await api.get('/logs/all', {
    params: {
      ...(userId ? { userId } : {}),
      limit,
    },
  });
  return response.data;
};

export const getHandlerActivityLogs = async (handlerId, { startDate, endDate, livestockId } = {}) => {
  const response = await api.get(`/logs/handler/${handlerId}`, {
    params: {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(livestockId ? { livestockId } : {}),
    },
  });
  return response.data;
};

export const getInventorySummary = async () => {
  const response = await api.get('/inventory/summary');
  return response.data;
};

export const getBusinessTrends = async (range = '7d') => {
  const response = await api.get('/analytics/business-trends', {
    params: { range },
  });
  return response.data;
};

export const getResourceEfficiency = async (livestockId, range = '7d') => {
  const response = await api.get('/analytics/resource-efficiency', {
    params: { livestockId, range },
  });
  return response.data;
};

export const getInventorySpeciesBatches = async (livestockId) => {
  const response = await api.get(`/inventory/summary/${livestockId}/batches`);
  return response.data;
};

export const archiveInventoryBatch = async (batchId) => {
  const response = await api.put(`/inventory/batches/${batchId}/archive`);
  return response.data;
};

export const updateInventoryBatchAssignment = async (batchId, data) => {
  const response = await api.put(`/inventory/batches/${batchId}/assignment`, data);
  return response.data;
};

export const updateInventorySpecies = async (livestockId, data) => {
  const response = await api.put(`/inventory/species/${livestockId}`, data);
  return response.data;
};

export const deleteAdminLivestockSpecies = async (livestockId) => {
  const response = await api.delete(`/admin/livestock/${livestockId}`);
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

  const token = getAuthToken();
  const response = await api.post(`/user/photo/${userId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token && { Authorization: `Bearer ${token}` }),
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
// JWT TOKEN HELPERS
// =============================================

/**
 * Decode a JWT token without verification.
 * @param {string} token - JWT token string
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/**
 * Get JWT token from storage.
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Get user role from stored JWT token.
 * @returns {string|null} - Role string (ROLE_ADMIN, ROLE_HANDLER) or null
 */
export const getUserRole = () => {
  const token = getAuthToken();
  if (!token) return null;
  const decoded = decodeJwt(token);
  return decoded?.role || null;
};

/**
 * Check if user has admin role.
 */
export const isAdmin = () => {
  return getUserRole() === 'ROLE_ADMIN';
};

/**
 * Check if user has handler role.
 */
export const isHandler = () => {
  return getUserRole() === 'ROLE_HANDLER';
};

/**
 * Check if JWT token is expired.
 */
export const isTokenExpired = () => {
  const token = getAuthToken();
  if (!token) return true;
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 < Date.now();
};

// =============================================
// SESSION HELPERS (localStorage-based with JWT)
// =============================================

export const saveUserSession = (user) => {
  const serialized = JSON.stringify(user);
  localStorage.setItem('authUser', serialized);
  localStorage.setItem('user_data', serialized);

  // Save JWT token separately for easy access
  if (user.token) {
    localStorage.setItem('authToken', user.token);
  }
};

export const getUserSession = () => {
  const stored = localStorage.getItem('user_data') || localStorage.getItem('authUser');
  return stored ? JSON.parse(stored) : null;
};

export const clearUserSession = () => {
  localStorage.removeItem('authUser');
  localStorage.removeItem('user_data');
  localStorage.removeItem('authToken');
};

export default api;
