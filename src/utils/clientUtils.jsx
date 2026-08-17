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
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object' && '$numberDecimal' in value) {
    const parsed = Number(value.$numberDecimal);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function formatOptionalNumber(value) {
  if (value == null) return '---';
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
  const normalizeEnv = (value) => {
    if (typeof value === 'string') return value.toLowerCase();
    return value?.id ?? value?.name ?? value?.slug ?? '';
  };
  const envs = client.envs ?? client.environments;
  if (Array.isArray(envs) && envs.length > 0) return envs.map(normalizeEnv).filter(Boolean);
  const env = client.__env ?? client.env ?? client.environment ?? client.environmentName;
  if (env) return [normalizeEnv(env)].filter(Boolean);
  return [];
}

export function getClientsPayload(response) {
  if (Array.isArray(response)) {
    return { clients: response, pagination: null };
  }

  if (Array.isArray(response?.clients)) {
    return { clients: response.clients, pagination: response?.pagination ?? null };
  }

  if (Array.isArray(response?.items)) {
    return { clients: response.items, pagination: response?.pagination ?? null };
  }

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

  if (Array.isArray(response?.data?.clients)) {
    return {
      clients: response.data.clients,
      pagination: response?.data?.pagination ?? response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data?.items)) {
    return {
      clients: response.data.items,
      pagination: response?.data?.pagination ?? response?.pagination ?? null,
    };
  }

  return {
    clients: [],
    pagination: response?.data?.pagination ?? response?.pagination ?? null,
  };
}
