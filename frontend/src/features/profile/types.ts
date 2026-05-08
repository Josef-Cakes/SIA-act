export type UserRole = 'USER' | 'MANAGER' | 'ADMIN';

export interface CreateProfilePayload {
  email: string;
  username: string;
  bio: string;
  role: UserRole;
}

export interface EditProfilePayload {
  email: string;
  username: string;
  bio: string;
  role: UserRole;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ProfileViewModel {
  id: number;
  email: string;
  username: string;
  bio: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface ApiResult<T> {
  success: boolean;
  message: string;
  data?: T;
}
