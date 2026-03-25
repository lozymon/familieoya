import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  setTokenAccessors,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  // Wire token accessors into the axios interceptor
  useEffect(() => {
    setTokenAccessors(
      () => accessToken,
      (token) => setAccessToken(token),
    );
  }, [accessToken]);

  // Attempt a silent refresh on mount to restore session
  useEffect(() => {
    const tryRestore = async () => {
      try {
        const { data } = await import('@familieoya/api-client').then((m) =>
          m.apiClient.post<{ accessToken: string }>('/auth/refresh'),
        );
        setAccessToken(data.accessToken);
        const profile = await getMe();
        setUser(profile);
      } catch {
        // No valid refresh token — user stays logged out
      } finally {
        setIsLoading(false);
      }
    };
    void tryRestore();
  }, []);

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

  const login = useCallback(async (dto: LoginDto) => {
    const { accessToken: token } = await apiLogin(dto);
    setAccessToken(token);
    const profile = await getMe();
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{ accessToken, user, isLoading, login, logout, setAccessToken }}
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
