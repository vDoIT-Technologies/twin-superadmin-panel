import { apiGet, isApiConfigured } from './apiClient';

function extractList(payload, key) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.[key],
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

export function getFilebaseQuota(params = {}) {
  return apiGet('/api/v1/vault/filebase-quota', params);
}

export default {
  dropdownApiAvailable,
  getClientsDropdown,
  getTwinsDropdown,
  getUsersDropdown,
  getFilebaseQuota,
};
