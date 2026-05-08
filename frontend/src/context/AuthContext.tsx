import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { resolveBackendUrl } from '../config/env';
import { clearUserSession, getProfile, saveUserSession } from '../features/auth/authService';

const USER_DATA_KEY = 'user_data';
const LEGACY_USER_KEY = 'authUser';
const DEFAULT_SYNC_STATUS = {
  state: 'idle',
  lastSyncedAt: null,
};

function resolveProfilePhotoUrl(url) {
  return resolveBackendUrl(url);
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
  const [syncStatus, setSyncStatusState] = useState(DEFAULT_SYNC_STATUS);
  const userRef = useRef(user);
  const lastProfileFetchAtRef = useRef(0);
  const hydratedUserIdRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const persistUser = useCallback((nextUser) => {
    if (!nextUser) {
      clearUserSession();
      return;
    }

    saveUserSession(nextUser);
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
    setSyncStatusState(DEFAULT_SYNC_STATUS);
    lastProfileFetchAtRef.current = 0;
    hydratedUserIdRef.current = null;
  }, [persistUser]);

  const setSyncStatus = useCallback((updater) => {
    setSyncStatusState((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : { ...previous, ...updater };
      return {
        state: next?.state || DEFAULT_SYNC_STATUS.state,
        lastSyncedAt: next?.lastSyncedAt ?? null,
      };
    });
  }, []);

  const fetchProfile = useCallback(async ({ force = false, revalidate = true, silent = false, seedUser = null } = {}) => {
    const currentUser = seedUser ?? userRef.current;
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

      const next = normalizeProfileData(response.data, currentUser);
      userRef.current = next;
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

  const applyAuthenticatedUser = useCallback(async (authenticatedUser, { silent = true } = {}) => {
    if (!authenticatedUser) {
      clearUser();
      return null;
    }

    const seededUser = normalizeProfileData(authenticatedUser, null);
    userRef.current = seededUser;
    setUser(seededUser);
    persistUser(seededUser);
    hydratedUserIdRef.current = seededUser.id ?? null;
    lastProfileFetchAtRef.current = 0;

    if (!seededUser.id) {
      return seededUser;
    }

    return fetchProfile({
      force: true,
      revalidate: false,
      silent,
      seedUser: seededUser,
    });
  }, [clearUser, fetchProfile, persistUser]);

  const value = useMemo(() => ({
    user,
    isProfileLoading,
    syncStatus,
    setSyncStatus,
    fetchProfile,
    applyAuthenticatedUser,
    updateCachedUser,
    clearUser,
  }), [user, isProfileLoading, syncStatus, setSyncStatus, fetchProfile, applyAuthenticatedUser, updateCachedUser, clearUser]);

  // Initial profile fetch on mount only - prevents infinite loop
  useEffect(() => {
    if (!user?.id) {
      hydratedUserIdRef.current = null;
      return;
    }
    if (hydratedUserIdRef.current === user.id) return;
    hydratedUserIdRef.current = user.id;
    void fetchProfile({ force: false, revalidate: true, silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-fetch when user ID changes, not when fetchProfile changes

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
