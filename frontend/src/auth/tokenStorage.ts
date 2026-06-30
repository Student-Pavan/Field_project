import { TOKEN_KEYS } from "../utils/constants";

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEYS.access);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEYS.refresh);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  sessionStorage.setItem(TOKEN_KEYS.access, accessToken);
  sessionStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
}

export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_KEYS.access);
  sessionStorage.removeItem(TOKEN_KEYS.refresh);
}
