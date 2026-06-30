import axios from "axios";
import type { LoginRequest, RegisterRequest, TokenResponse, User } from "../types";
import { apiClient } from "../api/client";
import { clearTokens, getRefreshToken, setTokens } from "./tokenStorage";

export async function loginRequest(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function registerRequest(payload: RegisterRequest): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/register", payload);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function refreshAccessToken(): Promise<TokenResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const { data } = await apiClient.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export function logoutLocal(): void {
  clearTokens();
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg ?? String(item)).join(", ");
    }
  }
  return fallback;
}
