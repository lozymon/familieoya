import axios, { type AxiosInstance } from 'axios';

let tokenGetter: (() => string | null) | null = null;
let tokenSetter: ((token: string | null) => void) | null = null;

export function setTokenAccessors(
  getter: () => string | null,
  setter: (token: string | null) => void,
) {
  tokenGetter = getter;
  tokenSetter = setter;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL:
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, Record<string, string>>).__ENV__
          ?.VITE_API_URL ?? 'http://localhost:3000')
      : 'http://localhost:3000',
  withCredentials: true, // send httpOnly refresh cookie
});

apiClient.interceptors.request.use((config) => {
  const token = tokenGetter?.();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
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
        tokenSetter?.(newToken);
        onRefreshed(newToken);
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest as Parameters<typeof apiClient>[0]);
      } catch {
        tokenSetter?.(null);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
