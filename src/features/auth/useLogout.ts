import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clearUserSession } from './authService';

export function useLogoutAction() {
  const navigate = useNavigate();
  const { clearUser } = useAuth();

  return useCallback(() => {
    clearUser();
    clearUserSession();
    navigate('/login', { replace: true });
  }, [clearUser, navigate]);
}
