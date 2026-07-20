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

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
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
  };
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
      const response = await refreshClient.post(path, { refreshToken });
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

async function refreshAccessToken() {
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
