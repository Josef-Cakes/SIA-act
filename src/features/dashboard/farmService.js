import api from '../auth/authService';
import {
  configureOfflineSync,
  enqueueOperation,
  pendingOperationResponse,
} from './offlineQueue';

const createOperationId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const sendLogAction = async (data) => {
  const response = await api.post('/dashboard/log-action', data);
  return response.data;
};

configureOfflineSync(sendLogAction);

export const postLogAction = async (data) => {
  const operationId = data?.operationId
    || createOperationId();
  const payload = { ...data, operationId };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueOperation(payload);
    return pendingOperationResponse(payload);
  }

  try {
    return await sendLogAction(payload);
  } catch (error) {
    if (!error?.response) {
      await enqueueOperation(payload);
      return pendingOperationResponse(payload);
    }
    throw error;
  }
};

export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

export const getRecentLogs = async () => {
  const response = await api.get('/dashboard/recent-logs');
  return response.data;
};

export const getLivestockInventory = async () => {
  const response = await api.get('/dashboard/livestock');
  return response.data;
};

export const getLivestockBatches = async (livestockId) => {
  const response = await api.get(`/dashboard/livestock/${livestockId}/batches`);
  return response.data;
};

export const createLivestockSpecies = async (data) => {
  const response = await api.post('/dashboard/livestock', data);
  return response.data;
};

export const createInventoryBatch = async (data) => {
  const response = await api.post('/dashboard/batches', data);
  return response.data;
};
