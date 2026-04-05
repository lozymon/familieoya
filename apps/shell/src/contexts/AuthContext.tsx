import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  setTokenAccessors,
  setHouseholdIdAccessor,
  login as apiLogin,
  logout as apiLogout,
  getMe,
  connectNotificationSocket,
  AuthContext,
  type AuthContextValue,
  type UserProfile,
  type LoginDto,
} from '@familieoya/api-client';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const HOUSEHOLD_STORAGE_KEY = 'familieoya_active_household';
const SESSION_TOKEN_KEY = 'familieoya_access_token';

function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload)) as { exp: number };
    return exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<
    string | null
  >(() => localStorage.getItem(HOUSEHOLD_STORAGE_KEY));
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Centralised token setter — updates ref, sessionStorage, and React state.
  const applyToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
    setAccessToken(token);
  }, []);

  // Wire accessors once so the axios interceptor can read/write the token.
  useEffect(() => {
    setTokenAccessors(() => tokenRef.current, applyToken);
  }, [applyToken]);

  const setActiveHouseholdId = useCallback((id: string | null) => {
    setActiveHouseholdIdState(id);
    if (id) {
      localStorage.setItem(HOUSEHOLD_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(HOUSEHOLD_STORAGE_KEY);
    }
  }, []);

  // Wire household ID accessor into the axios interceptor
  useEffect(() => {
    setHouseholdIdAccessor(() => activeHouseholdId);
  }, [activeHouseholdId]);

  // Attempt to restore session on mount:
  // 1. Use sessionStorage token if still valid (no network round-trip).
  // 2. Fall back to httpOnly refresh cookie.
  useEffect(() => {
    const tryRestore = async () => {
      const stored = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (stored && !isTokenExpired(stored)) {
        tokenRef.current = stored;
        setAccessToken(stored);
        try {
          const profile = await getMe();
          setUser(profile);
        } catch {
          applyToken(null);
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await import('@familieoya/api-client').then((m) =>
          m.apiClient.post<{ accessToken: string }>('/auth/refresh'),
        );
        applyToken(data.accessToken);
        const profile = await getMe();
        setUser(profile);
      } catch {
        // No valid session — user must log in
      } finally {
        setIsLoading(false);
      }
    };
    void tryRestore();
  }, [applyToken]);

  // Connect/disconnect WebSocket based on token
  useEffect(() => {
    if (accessToken) {
      socketRef.current = connectNotificationSocket(accessToken, () => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
    } else {
      socketRef.current?.disconnect();
      socketRef.current = null;
    }
    return () => {
      socketRef.current?.disconnect();
    };
  }, [accessToken, queryClient]);

  const login = useCallback(
    async (dto: LoginDto) => {
      const { accessToken: token } = await apiLogin(dto);
      applyToken(token);
      const profile = await getMe();
      setUser(profile);
    },
    [applyToken],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      applyToken(null);
      setUser(null);
      queryClient.clear();
    }
  }, [applyToken, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isLoading,
        activeHouseholdId,
        login,
        logout,
        setAccessToken: applyToken,
        setActiveHouseholdId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
