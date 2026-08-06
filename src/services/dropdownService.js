import { apiGet, isApiConfigured } from './apiClient';

function extractList(payload, key) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.[key],
    payload?.data,
    payload?.data?.[key],
    payload?.data?.users,
    payload?.data?.topUsers,
    payload?.data?.storageByClient,
    payload?.storageByClient,
    payload?.topUsersByStorage,
    payload?.items,
    payload?.results,
  ];

  return candidates.find(Array.isArray) ?? [];
}

export const dropdownApiAvailable = () => isApiConfigured();

export async function getClientsDropdown(params = {}) {
  const payload = await apiGet('/api/v1/dropdown/clients', params);
  return extractList(payload, 'clients');
}

export async function getTwinsDropdown(params = {}) {
  const payload = await apiGet('/api/v1/dropdown/twins', params);
  return extractList(payload, 'twins');
}

export async function getUsersDropdown(params = {}) {
  const payload = await apiGet('/api/v1/dropdown/users', params);
  return extractList(payload, 'users');
}

export function getStorageUsage(params = {}) {
  return apiGet('/api/v1/vault/storage-usage', params);
}

export async function getStorageByClient(params = {}) {
  const payload = await apiGet('/api/v1/vault/storage-by-client', params);
  return extractList(payload, 'clients');
}

export async function getFilebaseTopUsers(params = {}) {
  const payload = await apiGet('/api/v1/vault/top-users', params);
  const topUsers = extractList(payload, 'topUsers');
  return topUsers.length ? topUsers : extractList(payload, 'users');
}

export default {
  dropdownApiAvailable,
  getClientsDropdown,
  getTwinsDropdown,
  getUsersDropdown,
  getStorageUsage,
  getStorageByClient,
  getFilebaseTopUsers,
};
