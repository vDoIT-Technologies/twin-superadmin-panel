import axios from 'axios';
import {
  clearStoredSession,
  readStoredSession,
  updateStoredSessionTokens,
} from './authSessionStorage';

const baseURL = import.meta.env.VITE_API_BASE_URL;
const refreshPath = import.meta.env.VITE_AUTH_REFRESH_PATH;
let authToken = null;
let refreshRequest = null;
export const TOKEN_REFRESH_LEEWAY_MS = 30_000;

const api = axios.create({
  baseURL,
  withCredentials: true,
  // Do not abort data requests on a client-side timer. The API response
  // determines success/failure, which avoids empty dashboard states when a
  // legitimate aggregate query needs more than 20 seconds.
  timeout: 0,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 0,
});

function getPayload(data) {
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data;
  }

  if (data?.result && typeof data.result === 'object' && !Array.isArray(data.result)) {
    return data.result;
  }

  return data ?? {};
}

function getMessage(source, fallbackMessage) {
  return (
    source?.message ||
    source?.error ||
    source?.data?.message ||
    source?.data?.error ||
    source?.result?.message ||
    source?.result?.error ||
    fallbackMessage
  );
}

function getTokenBundle(data) {
  const payload = getPayload(data);

  return {
    token:
      payload.token ||
      payload.accessToken ||
      payload.access_token ||
      payload.jwt ||
      data?.token ||
      data?.accessToken ||
      data?.access_token ||
      data?.jwt ||
      null,
    refreshToken:
      payload.refreshToken ||
      payload.refresh_token ||
      data?.refreshToken ||
      data?.refresh_token ||
      null,
    expiresAt:
      payload.expiresAt ||
      payload.expires_at ||
      payload.accessTokenExpiresAt ||
      payload.access_token_expires_at ||
      data?.expiresAt ||
      data?.expires_at ||
      data?.accessTokenExpiresAt ||
      data?.access_token_expires_at ||
      null,
    expiresIn:
      payload.expiresIn ??
      payload.expires_in ??
      payload.accessTokenExpiresIn ??
      payload.access_token_expires_in ??
      data?.expiresIn ??
      data?.expires_in ??
      data?.accessTokenExpiresIn ??
      data?.access_token_expires_in ??
      null,
    refreshTokenExpiresAt:
      payload.refreshTokenExpiresAt ||
      payload.refresh_token_expires_at ||
      data?.refreshTokenExpiresAt ||
      data?.refresh_token_expires_at ||
      null,
  };
}

function normalizeExpiryTimestamp(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === 'string') {
    const numeric = Number(value);

    if (Number.isFinite(numeric) && value.trim() !== '') {
      return numeric > 1e12 ? numeric : numeric * 1000;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeExpiryDurationMs(value) {
  if (value == null) {
    return null;
  }

  const numeric = typeof value === 'string' ? Number(value) : value;

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric * 1000;
}

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');

  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(window.atob(normalized));
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token) {
  const payload = parseJwtPayload(token);

  if (!payload?.exp || typeof payload.exp !== 'number') {
    return null;
  }

  return payload.exp * 1000;
}

export function resolveSessionExpiryMs(sessionLike) {
  const explicitExpiryMs = normalizeExpiryTimestamp(sessionLike?.expiresAt);

  if (explicitExpiryMs) {
    return explicitExpiryMs;
  }

  const expiresInMs = normalizeExpiryDurationMs(sessionLike?.expiresIn);

  if (expiresInMs) {
    return Date.now() + expiresInMs;
  }

  return getTokenExpiryMs(sessionLike?.token);
}

export function shouldRefreshToken(token) {
  const expiryMs = resolveSessionExpiryMs({ token });

  if (!expiryMs) {
    return false;
  }

  return expiryMs - Date.now() <= TOKEN_REFRESH_LEEWAY_MS;
}

function isAuthRoute(url = '') {
  return /\/api\/v1\/auth\/(login|verify-login-otp|resend-login-otp|logout|refresh-token|refresh)\b/i.test(url);
}

function getRefreshPaths() {
  if (refreshPath) {
    return [refreshPath];
  }

  return ['/api/v1/auth/refresh-token', '/api/v1/auth/refresh'];
}

async function requestTokenRefresh(refreshToken) {
  const refreshPaths = getRefreshPaths();
  let lastError = null;

  for (const path of refreshPaths) {
    try {
      const response = await refreshClient.post(path, {
        refreshToken,
        refresh_token: refreshToken,
      });
      const message = getMessage(response.data, 'Unable to refresh your session.');

      if (response.data?.success === false) {
        throw new Error(message);
      }

      const tokens = getTokenBundle(response.data);

      if (!tokens.token) {
        throw new Error('Session refresh succeeded but no new access token was returned.');
      }

      return tokens;
    } catch (error) {
      lastError = error;

      if (!refreshPath && error?.response?.status === 404 && path !== refreshPaths[refreshPaths.length - 1]) {
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error('Unable to refresh your session.');
}

export async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const session = readStoredSession();
      const refreshToken = session?.refreshToken;

      if (!refreshToken) {
        throw new Error('No refresh token available.');
      }

      const tokens = await requestTokenRefresh(refreshToken);
      const nextSession = updateStoredSessionTokens(tokens, { notify: true });
      authToken = nextSession?.token ?? tokens.token;
      return authToken;
    })()
      .catch((error) => {
        authToken = null;
        clearStoredSession({ notify: true });
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const session = readStoredSession();

    if (
      error?.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRoute(originalRequest.url) ||
      !authToken ||
      !session?.refreshToken
    ) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const nextToken = await refreshAccessToken();
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${nextToken}`,
      };
      return api(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);

export function setAuthToken(token) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

export default api;
