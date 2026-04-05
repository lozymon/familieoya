import axios, { type AxiosInstance } from 'axios';

// Each MFE bundle gets its own copy of this module, so module-level variables
// are not shared across bundles. Store accessors on window so every MFE reads
// the same token that the shell's AuthProvider sets.
const WIN_KEY = '__familieoya_token_accessors__';

declare global {
  interface Window {
    [WIN_KEY]?: {
      get: () => string | null;
      set: (token: string | null) => void;
      getHouseholdId: () => string | null;
    };
  }
}

export function setTokenAccessors(
  getter: () => string | null,
  setter: (token: string | null) => void,
) {
  if (typeof window !== 'undefined') {
    window[WIN_KEY] = {
      get: getter,
      set: setter,
      getHouseholdId: window[WIN_KEY]?.getHouseholdId ?? (() => null),
    };
  }
}

export function setHouseholdIdAccessor(getter: () => string | null) {
  if (typeof window !== 'undefined') {
    window[WIN_KEY] = {
      get: window[WIN_KEY]?.get ?? (() => null),
      set: window[WIN_KEY]?.set ?? (() => undefined),
      getHouseholdId: getter,
    };
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly refresh cookie
});

apiClient.interceptors.request.use((config) => {
  const token = window[WIN_KEY]?.get();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const householdId = window[WIN_KEY]?.getHouseholdId();
  if (householdId) {
    config.headers['X-Household-ID'] = householdId;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as {
      config?: { _retry?: boolean; headers?: Record<string, string> };
      response?: { status: number };
    };
    const originalRequest = axiosError.config;

    if (
      axiosError.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve) => {
          refreshSubscribers.push(resolve);
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return apiClient(originalRequest as Parameters<typeof apiClient>[0]);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{ accessToken: string }>(
          '/auth/refresh',
        );
        const newToken = data.accessToken;
        window[WIN_KEY]?.set(newToken);
        onRefreshed(newToken);
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest as Parameters<typeof apiClient>[0]);
      } catch {
        window[WIN_KEY]?.set(null);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
