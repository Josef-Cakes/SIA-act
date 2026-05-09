import api from '../auth/authService';
import type {
  ApiResult,
  ChangePasswordPayload,
  CreateProfilePayload,
  EditProfilePayload,
  ProfileViewModel,
} from './types';

const apiClient: any = api;

export async function createProfile(payload: CreateProfilePayload): Promise<ApiResult<ProfileViewModel>> {
  const response = await apiClient.post('/profiles/onboarding', payload);
  return response.data;
}

export async function getProfileById(userId: number): Promise<ApiResult<ProfileViewModel>> {
  const response = await apiClient.get(`/profiles/${userId}`);
  return response.data;
}

export async function editProfile(userId: number, payload: EditProfilePayload): Promise<ApiResult<ProfileViewModel>> {
  const response = await apiClient.put(`/profiles/${userId}`, payload);
  return response.data;
}

export async function uploadAvatar(userId: number, file: File): Promise<ApiResult<string>> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`/profiles/${userId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function changePassword(userId: number, payload: ChangePasswordPayload): Promise<ApiResult<void>> {
  const response = await apiClient.put(`/profiles/${userId}/password`, payload);
  return response.data;
}
