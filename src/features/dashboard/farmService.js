import api from '../auth/authService';
import {
  configureOfflineSync,
  enqueueOperation,
  pendingOperationResponse,
} from './offlineQueue';

const createOperationId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const sendLogAction = async (data) => {
  // Canonical versioned command endpoint. The legacy dashboard write path is
  // retained only for older clients and must not become a second domain path.
  const response = await api.post('/v1/operations', data);
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

export const correctOperation = async (eventId, reason, operationId) => {
  const response = await api.post(`/v1/operations/${eventId}/correction`, {
    reason,
    operationId,
  });
  return response.data;
};

export const downloadDailyOperationsReport = async (date) => {
  const response = await api.get('/v1/reports/daily.csv', {
    params: date ? { date } : undefined,
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `farm-operations-${date || new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

export const getRecentLogs = async () => {
  const response = await api.get('/dashboard/recent-logs');
  return response.data;
};

export const getOperationalAlerts = async () => {
  const response = await api.get('/handler/alerts');
  return response.data;
};

export const getAssignedOperationalTasks = async () => {
  const response = await api.get('/handler/tasks');
  return response.data;
};

export const getOperationalTasksForManagement = async () => {
  const response = await api.get('/v1/operations-management/tasks');
  return response.data;
};

export const getOperationalAlertsForManagement = async () => {
  const response = await api.get('/v1/operations-management/alerts');
  return response.data;
};

export const updateOperationalTaskStatus = async (taskId, status) => {
  const response = await api.put(`/v1/operations-management/tasks/${taskId}/status`, null, { params: { status } });
  return response.data;
};

export const updateAssignedOperationalTaskStatus = async (taskId, status) => {
  const response = await api.put(`/handler/tasks/${taskId}/status`, null, { params: { status } });
  return response.data;
};

export const acknowledgeOperationalAlert = async (alertId) => {
  const response = await api.put(`/v1/operations-management/alerts/${alertId}/acknowledge`);
  return response.data;
};

export const resolveOperationalAlert = async (alertId, resolutionNote) => {
  const response = await api.put(`/v1/operations-management/alerts/${alertId}/resolve`, null, {
    params: { resolutionNote },
  });
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
