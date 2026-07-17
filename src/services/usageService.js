// Live OpenAI token-usage service (SuperAdmin backend).
//
// Maps the panel's FilterContext into backend query params, fetches real usage,
// and shapes it for the UsagePage charts/tables. All calls degrade gracefully:
// callers should treat a thrown error / unconfigured API as "fall back to demo".
import { apiGet, isApiConfigured } from './apiClient';

export const usageApiAvailable = () => isApiConfigured();

// FilterContext -> backend query params.
// env: backend takes a single env; only send it when exactly one is selected.
// range: '7d' | '30d' | '90d' | '24h' — backend parses this directly.
const mapServerFilters = (filters = {}) => {
  const params = {};
  if (Array.isArray(filters.envs) && filters.envs.length === 1) params.env = filters.envs[0];
  if (filters.range) params.range = filters.range;
  // client/user ids in the demo dataset are synthetic and don't map to real
  // tenant ids, so we intentionally don't forward them as server filters; the
  // per-user / per-client tables surface the real entities instead.
  return params;
};

export const getTokenFacts = (filters) => apiGet('api/v1/usage/tokens', mapServerFilters(filters));
export const getUsageByUser = (filters) => apiGet('api/v1/usage/by-user', mapServerFilters(filters));
export const getUsageByClient = (filters) => apiGet('api/v1/usage/by-client', mapServerFilters(filters));
export const getUsageSummary = (filters) => apiGet('api/v1/usage/summary', mapServerFilters(filters));

// Aggregate fact rows into a per-day token time series.
export const buildTokenTimeSeries = (facts = []) => {
  const byDay = new Map();
  let totalTokens = 0;
  let totalCost = 0;
  for (const f of facts) {
    byDay.set(f.day, (byDay.get(f.day) || 0) + (f.tokens || 0));
    totalTokens += f.tokens || 0;
    totalCost += f.cost || 0;
  }
  const days = [...byDay.keys()].sort();
  return {
    labels: days.map((d) => d.slice(5)), // MM-DD
    values: days.map((d) => byDay.get(d)),
    totalTokens,
    totalCost,
  };
};

/**
 * One-shot loader for the UsagePage. Returns { live:false } if the API is
 * unconfigured or any request fails, so the page can fall back to demo data.
 */
export const loadTokenUsage = async (filters) => {
  if (!usageApiAvailable()) return { live: false };
  try {
    const [facts, byUser, byClient] = await Promise.all([
      getTokenFacts(filters),
      getUsageByUser(filters),
      getUsageByClient(filters),
    ]);
    const series = buildTokenTimeSeries(facts || []);
    return {
      live: true,
      ...series,
      byUser: byUser || [],
      byClient: byClient || [],
    };
  } catch (error) {
    console.error('[usageService] live load failed, using demo data:', error.message);
    return { live: false, error: error.message };
  }
};

export default {
  usageApiAvailable,
  getTokenFacts,
  getUsageByUser,
  getUsageByClient,
  getUsageSummary,
  buildTokenTimeSeries,
  loadTokenUsage,
};
