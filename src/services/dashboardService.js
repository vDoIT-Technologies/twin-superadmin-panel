import { superadminDemoData } from '../demo-data/superadminDemoData';
import { defaultDemoFilters, groupBy, selectFacts, sumMetric } from '../demo-data/superadminSelectors';
import { mockGet } from './apiClient';

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

function buildClients() {
  return superadminDemoData.CLIENTS.map((client) => {
    const rows = selectFacts(overviewFilters, { client: client.id });
    const twins = superadminDemoData.TWINS.filter((twin) => twin.clientId === client.id).length;
    const messages = sumMetric(rows, 'messages', overviewFilters);
    return {
      id: client.id,
      name: client.name,
      plan: client.plan,
      status: client.id === superadminDemoData.ANOMALY.clientId ? 'watch' : 'active',
      region: client.industry,
      twins,
      messages: Math.round(messages),
    };
  });
}

function buildTwins() {
  return superadminDemoData.TWINS.map((twin) => ({
    id: twin.id,
    name: twin.name,
    client: superadminDemoData.byId.client(twin.clientId)?.name ?? 'Unknown',
    health: twin.clientId === superadminDemoData.ANOMALY.clientId ? 'watch' : 'healthy',
    alerts: twin.clientId === superadminDemoData.ANOMALY.clientId ? 3 : 0,
    lastSync: `${Math.max(1, Math.round(twin.createdDaysAgo / 10))} min ago`,
  }));
}

function buildUsers() {
  return superadminDemoData.USERS.slice(0, 20).map((user) => ({
    id: user.id,
    name: user.name,
    role: 'Platform user',
    email: `${user.name.toLowerCase().replace(/\s+/g, '.')}@${superadminDemoData.byId.client(user.clientId)?.name.toLowerCase().replace(/\s+/g, '')}.dev`,
    status: user.lastActiveDaysAgo <= 7 ? 'active' : 'pending',
  }));
}

function buildServices() {
  const costGroups = groupBy(selectFacts(overviewFilters), 'service', 'cost', overviewFilters);
  return superadminDemoData.SERVICES.map((service) => {
    const serviceCost = costGroups.find((group) => group.id === service.id)?.value ?? 0;
    return {
      id: service.id,
      name: service.name,
      uptime: service.id === 'sdk' ? '99.74%' : '99.93%',
      latency: `${Math.max(110, Math.round(serviceCost / 40))} ms`,
      status: service.id === superadminDemoData.ANOMALY.service ? 'watch' : 'healthy',
    };
  });
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
      recentClients: buildClients().slice(0, 5),
      serviceHealth: buildServices(),
    });
  },
  getClients() {
    return mockGet(buildClients());
  },
  getTwins() {
    return mockGet(buildTwins());
  },
  getUsers() {
    return mockGet(buildUsers());
  },
  getServices() {
    return mockGet(buildServices());
  },
  getFinancialSummary() {
    return mockGet(buildFinancialSummary());
  },
};
