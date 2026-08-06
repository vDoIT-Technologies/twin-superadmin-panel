import { formatNumber } from "./dashboardUtils";

export function getClientInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim().slice(0, 1).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function parseDecimal(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && '$numberDecimal' in value) {
    const parsed = Number(value.$numberDecimal);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function formatOptionalNumber(value) {
  if (value == null) return '';
  return formatNumber(value);
}

export function formatLastActive(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return '1d ago';
  return `${daysAgo}d ago`;
}

export function getEnvList(client) {
  // Try envs array first, then fall back to __env
  if (Array.isArray(client.envs) && client.envs.length > 0) return client.envs;
  if (client.__env) return [client.__env];
  return [];
}

export function getClientsPayload(response) {
  if (Array.isArray(response?.data)) {
    return {
      clients: response.data,
      pagination: response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data?.data)) {
    return {
      clients: response.data.data,
      pagination: response?.data?.pagination ?? response?.pagination ?? null,
    };
  }

  return {
    clients: [],
    pagination: response?.data?.pagination ?? response?.pagination ?? null,
  };
}