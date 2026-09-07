import { superadminDemoData } from '../demo-data/superadminDemoData';
import { defaultDemoFilters, selectFacts, sumMetric } from '../demo-data/superadminSelectors';
import { mockGet } from './apiClient';
import api from './httpClient';

const overviewFilters = defaultDemoFilters;

function buildOverviewMetrics() {
  const rows = selectFacts(overviewFilters);
  const totalCost = sumMetric(rows, 'cost', overviewFilters);
  const totalRevenue = sumMetric(rows, 'revenue', overviewFilters);
  const totalMessages = sumMetric(rows, 'messages', overviewFilters);
  const activeTwins = superadminDemoData.TWINS.length;

  return [
    { label: 'Total cost', value: Math.round(totalCost), change: '+9%', tone: 'warn' },
    { label: 'Total revenue', value: Math.round(totalRevenue), change: '+14%', tone: 'good' },
    { label: 'Messages', value: Math.round(totalMessages), change: '+11%', tone: 'good' },
    { label: 'Active twins', value: activeTwins, change: '+6%', tone: 'good' },
  ];
}

function buildFinancialSummary() {
  const rows = selectFacts(overviewFilters);
  const revenue = sumMetric(rows, 'revenue', overviewFilters);
  const cost = sumMetric(rows, 'cost', overviewFilters);
  const marginPct = revenue ? ((revenue - cost) / revenue) * 100 : 0;
  const pointsPurchased = sumMetric(rows, 'pointsPurchased', overviewFilters);

  return [
    { label: 'Revenue', value: Math.round(revenue) },
    { label: 'COGS', value: Math.round(cost) },
    { label: 'Margin', value: marginPct, suffix: '%' },
    { label: 'Points purchased', value: Math.round(pointsPurchased) },
  ];
}

export const dashboardService = {
  getSuperadminDataset() {
    return mockGet(superadminDemoData);
  },
  getOverview() {
    return mockGet({
      metrics: buildOverviewMetrics(),
    });
  },
  getFinancialSummary() {
    return mockGet(buildFinancialSummary());
  },

  // ---- Client APIs ----
  async getEntityClients(params = {}) {
    const response = await api.get('/api/v1/entities/clients', {
      params: {
        page: params.page,
        limit: params.limit,
        clientId: params.clientId,
        twinId: params.twinId,
        userId: params.userId,
        serviceId: params.serviceId,
        vendorId: params.vendorId,
        env: params.env,
        status: params.status,
        filter: params.filter,
        from: params.from,
        to: params.to,
      },
    });
    return response.data;
  },
  async searchEntityClients(params = {}) {
    const response = await api.get('/api/v1/search/clients', { params });
    return response.data;
  },
  async getEntityClientById(clientId, params = {}) {
    const response = await api.get(`/api/v1/entities/clients/${clientId}`, {
      params: {
        env: params.env,
      },
    });
    return response.data;
  },
  async getEntityClientTwins(clientId, params = {}) {
    const response = await api.get(`/api/v1/entities/clients/${clientId}/twins`, {
      params: {
        env: params?.env,
      },
    });
    return response.data;
  },
  async getEntityClientUsers(clientId, params = {}) {
    const response = await api.get(`/api/v1/entities/clients/${clientId}/users`, {
      params: {
        env: params?.env,
      },
    });
    return response.data;
  },
  async getEntityClientVault(clientId, params = {}) {
    const response = await api.get(`/api/v1/entities/clients/${clientId}/vault`, {
      params: {
        env: params?.env,
      },
    });
    return response.data;
  },

  // ---- Twin APIs ----
  async getEntityTwins(params = {}) {
    const response = await api.get('/api/v1/entities/twins', {
      params: {
        page: params.page,
        limit: params.limit,
        clientId: params.clientId,
        twinId: params.twinId,
        env: params.env,
        status: params.status,
        filter: params.filter,
        from: params.from,
        to: params.to,
      },
    });
    return response.data;
  },
  async searchEntityTwins(params = {}) {
    const response = await api.get('/api/v1/search/twins', { params });
    return response.data;
  },
  async getEntityTwinById(twinId, params = {}) {
    const response = await api.get(`/api/v1/entities/twins/${twinId}`,{
      params: {
        env: params?.env,
      },
    });
    return response.data;
  },

  // ---- User APIs ----
  async getEntityUsers(params = {}) {
    const response = await api.get('/api/v1/entities/users', {
      params: {
        page: params.page,
        limit: params.limit,
        clientId: params.clientId,
        twinId: params.twinId,
        userId: params.userId,
        env: params.env,
        filter: params.filter,
        from: params.from,
        to: params.to,
      },
    });
    return response.data;
  },
  async searchEntityUsers(params = {}) {
    const response = await api.get('/api/v1/search/users', { params });
    return response.data;
  },
  async getEntityUserById(userId, params = {}) {
    const response = await api.get(`/api/v1/entities/users/${userId}`,{
      params: {
        env: params?.env,
      },
    });
    return response.data;
  },

  // ---- Vault APIs ----
  async getEntityVaultUsers(params = {}) {
    const response = await api.get('/api/v1/entities/vault-users', {
      params: { page: params.page, limit: params.limit, userId: params.userId, env: params.env },
    });
    return response.data;
  },
  async getEntityVaultUserById(userId, params = {}) {
    const response = await api.get(`/api/v1/entities/vault-users/${userId}`,{
      params: {
        env: params?.env,
      },
    });
    return response.data;
  },
  async getEntityVaultStats(params = {}) {
    const response = await api.get('/api/v1/entities/vault-stats', {
      params: { env: params?.env },
    });
    return response.data;
  },

  // ---- Config APIs ----
  async getServicesStatus() {
    const response = await api.get('/api/v1/config/services-status');
    return response.data;
  },
};
