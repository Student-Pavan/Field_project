import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../auth/tokenStorage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: apiBaseUrl ? `${apiBaseUrl}/api/v1` : "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;
    const isAuthEndpoint = originalRequest.url?.includes("/auth/login")
      || originalRequest.url?.includes("/auth/register")
      || originalRequest.url?.includes("/auth/refresh");

    if (!isUnauthorized || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error("Missing refresh token");
        }

        const refreshUrl = apiBaseUrl
          ? `${apiBaseUrl}/api/v1/auth/refresh`
          : "/api/v1/auth/refresh";
        const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
          refreshUrl,
          { refresh_token: refreshToken },
        );

        setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      })().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const accessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearTokens();
      return Promise.reject(refreshError);
    }
  },
);

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}
