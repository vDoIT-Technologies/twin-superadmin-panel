// API client for the SuperAdmin backend.
//
// The panel ships with synthesized demo data and works fully offline. When
// VITE_API_BASE_URL is set, live endpoints (e.g. OpenAI usage) are fetched from
// the backend with a SuperAdmin bearer token. The token is read from localStorage
// ('accessToken'/'token') first, falling back to VITE_API_TOKEN for local dev.
const BASE = import.meta.env.VITE_API_BASE_URL || '';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- demo path (unchanged) --------------------------------------------------
export async function mockGet(payload, delay = 180) {
  await wait(delay);
  return structuredClone(payload);
}

// --- live path --------------------------------------------------------------
export const isApiConfigured = () => Boolean(BASE);

const getToken = () => {
  try {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      import.meta.env.VITE_API_TOKEN ||
      ''
    );
  } catch {
    return import.meta.env.VITE_API_TOKEN || '';
  }
};

export async function apiGet(path, params = {}) {
  if (!BASE) throw new Error('VITE_API_BASE_URL not configured');
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  const url = new URL(path.replace(/^\//, ''), base);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, value);
  });

  const token = getToken();
  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  // SuccessResponse wraps payloads as { success, message, data }.
  return json && Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
}
