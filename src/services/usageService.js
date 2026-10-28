import { apiGet, isApiConfigured } from './apiClient';

export const usageApiAvailable = () => isApiConfigured();

const mapServerFilters = (filters = {}) => {
  const params = {};
  if (Array.isArray(filters.envs) && filters.envs.length === 1) params.env = filters.envs[0];
  if (filters.range) params.range = filters.range;
  if (filters.client) params.clientId = filters.client;
  if (filters.twin) params.twinId = filters.twin;
  if (filters.user) params.userId = filters.user;
  return params;
};

export const getTokenFacts = (filters) => apiGet('/api/v1/usage/tokens', mapServerFilters(filters));
export const getUsageByUser = (filters) => apiGet('/api/v1/usage/by-user', mapServerFilters(filters));
export const getUsageByClient = (filters) => apiGet('/api/v1/usage/by-client', mapServerFilters(filters));
export const getUsageSummary = (filters) => apiGet('/api/v1/usage/summary', mapServerFilters(filters));

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
    labels: days.map((d) => d.slice(5)),
    values: days.map((d) => byDay.get(d)),
    totalTokens,
    totalCost,
  };
};

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

export const getUsageSummaryByRole = (filters) =>
  apiGet('/api/v1/usage/summary-by-role', mapServerFilters(filters));

export const loadUsageSummaryByRole = async (filters) => {
  if (!usageApiAvailable()) return { live: false };
  try {
    const data = await getUsageSummaryByRole(filters);
    return { live: true, ...data };
  } catch (error) {
    console.error('[usageService] summary-by-role load failed:', error.message);
    return { live: false, error: error.message };
  }
};

export const getVideoMinutesSeries = (filters) =>
  apiGet('/api/v1/usage/video-minutes-series', mapServerFilters(filters));

export const loadVideoMinutesSeries = async (filters) => {
  if (!usageApiAvailable()) return { live: false, series: [] };
  try {
    const data = await getVideoMinutesSeries(filters);
    return { live: true, series: data?.series || [] };
  } catch (error) {
    console.error('[usageService] video-minutes-series load failed:', error.message);
    return { live: false, series: [], error: error.message };
  }
};

export const getVoiceCharsSeries = (filters) =>
  apiGet('/api/v1/usage/voice-chars-series', mapServerFilters(filters));

export const loadVoiceCharsSeries = async (filters) => {
  if (!usageApiAvailable()) return { live: false, series: [] };
  try {
    const data = await getVoiceCharsSeries(filters);
    return { live: true, series: data?.series || [] };
  } catch (error) {
    console.error('[usageService] voice-chars-series load failed:', error.message);
    return { live: false, series: [], error: error.message };
  }
};

export const getOpenAiTokensSeries = (filters) =>
  apiGet('/api/v1/usage/openai-tokens-series', mapServerFilters(filters));

export const loadOpenAiTokensSeries = async (filters) => {
  if (!usageApiAvailable()) return { live: false, series: [] };
  try {
    const data = await getOpenAiTokensSeries(filters);
    return { live: true, series: data?.series || [] };
  } catch (error) {
    console.error('[usageService] openai-tokens-series load failed:', error.message);
    return { live: false, series: [], error: error.message };
  }
};

export const getMessagesModalitySeries = (filters) =>
  apiGet('/api/v1/usage/messages-modality-series', mapServerFilters(filters));

export const loadMessagesModalitySeries = async (filters) => {
  if (!usageApiAvailable()) return { live: false, series: [] };
  try {
    const data = await getMessagesModalitySeries(filters);
    return { live: true, series: data?.series || [] };
  } catch (error) {
    console.error('[usageService] messages-modality-series load failed:', error.message);
    return { live: false, series: [], error: error.message };
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
  getUsageSummaryByRole,
  loadUsageSummaryByRole,
  getVideoMinutesSeries,
  loadVideoMinutesSeries,
  getVoiceCharsSeries,
  loadVoiceCharsSeries,
  getOpenAiTokensSeries,
  loadOpenAiTokensSeries,
  getMessagesModalitySeries,
  loadMessagesModalitySeries,
};