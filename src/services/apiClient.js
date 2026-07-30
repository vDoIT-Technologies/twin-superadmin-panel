import api from './httpClient';

// API client for the SuperAdmin backend.
//
// The panel ships with synthesized demo data and works fully offline. When
// VITE_API_BASE_URL is set, live endpoints are fetched through httpClient,
// which attaches and refreshes the authenticated SuperAdmin bearer token.
const BASE = import.meta.env.VITE_API_BASE_URL || '';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- demo path (unchanged) --------------------------------------------------
export async function mockGet(payload, delay = 180) {
  await wait(delay);
  return structuredClone(payload);
}

// --- live path --------------------------------------------------------------
export const isApiConfigured = () => Boolean(BASE);

export async function apiGet(path, params = {}) {
  if (!BASE) {
    throw new Error('VITE_API_BASE_URL not configured');
  }

  const response = await api.get(path, {
    params: Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value != null && value !== '',
      ),
    ),
  });
  const json = response.data;

  // SuccessResponse wraps payloads as { success, message, data }.
  return json && Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
}
