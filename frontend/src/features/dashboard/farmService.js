import api from '../auth/authService';

export const postLogAction = async (data) => {
  const response = await api.post('/dashboard/log-action', data);
  return response.data;
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
