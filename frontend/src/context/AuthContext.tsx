import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getProfile } from '../features/auth/authService';

const USER_DATA_KEY = 'user_data';
const LEGACY_USER_KEY = 'authUser';
const BACKEND_ORIGIN = 'http://localhost:8080';

function resolveProfilePhotoUrl(url) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`;
  return `${BACKEND_ORIGIN}/${url}`;
}

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readInitialUser() {
  const cached = safeParse(localStorage.getItem(USER_DATA_KEY));
  if (cached) return cached;

  const legacy = safeParse(localStorage.getItem(LEGACY_USER_KEY));
  if (legacy) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(legacy));
    return legacy;
  }

  return null;
}

function normalizeProfileData(profile, currentUser) {
  const base = currentUser || {};
  return {
    ...base,
    ...profile,
    id: profile?.id ?? base?.id,
    fullName: profile?.fullName ?? base?.fullName,
    username: profile?.username ?? base?.username,
    email: profile?.email ?? base?.email,
    phone: profile?.phone ?? base?.phone,
    createdAt: profile?.createdAt ?? base?.createdAt,
    hasProfileImage: Boolean(profile?.hasProfileImage ?? base?.hasProfileImage),
    profilePhotoUrl: resolveProfilePhotoUrl(profile?.profilePhotoUrl) || base?.profilePhotoUrl,
  };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readInitialUser());
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const userRef = useRef(user);
  const lastProfileFetchAtRef = useRef(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const persistUser = useCallback((nextUser) => {
    if (!nextUser) {
      localStorage.removeItem(USER_DATA_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      return;
    }

    const serialized = JSON.stringify(nextUser);
    localStorage.setItem(USER_DATA_KEY, serialized);
    localStorage.setItem(LEGACY_USER_KEY, serialized);
  }, []);

  const updateCachedUser = useCallback((updater) => {
    setUser((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : { ...previous, ...updater };
      persistUser(next);
      return next;
    });
  }, [persistUser]);

  const clearUser = useCallback(() => {
    setUser(null);
    persistUser(null);
  }, [persistUser]);

  const fetchProfile = useCallback(async ({ force = false, revalidate = true, silent = false } = {}) => {
    const currentUser = userRef.current;
    const userId = currentUser?.id;
    if (!userId) return null;

    if (!force && currentUser?.profilePhotoUrl) {
      const shouldRevalidate = Date.now() - lastProfileFetchAtRef.current > 30000;
      if (revalidate && shouldRevalidate) {
        void fetchProfile({ force: true, revalidate: false, silent: true });
      }
      return currentUser;
    }

    if (!silent) setIsProfileLoading(true);

    try {
      const response = await getProfile(userId);
      if (!response?.success || !response?.data) {
        return currentUser;
      }

      const next = normalizeProfileData(response.data, userRef.current);
      setUser(next);
      persistUser(next);
      lastProfileFetchAtRef.current = Date.now();
      return next;
    } catch {
      return currentUser;
    } finally {
      if (!silent) setIsProfileLoading(false);
    }
  }, [persistUser]);

  const value = useMemo(() => ({
    user,
    isProfileLoading,
    fetchProfile,
    updateCachedUser,
    clearUser,
  }), [user, isProfileLoading, fetchProfile, updateCachedUser, clearUser]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchProfile({ force: false, revalidate: true, silent: true });
  }, [user?.id, fetchProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
