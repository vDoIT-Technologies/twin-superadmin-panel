import { superadminDemoData as data } from './superadminDemoData';

export const RANGE_DAYS = { '24h': 2, '7d': 7, '30d': 30, '90d': 90 };

export const defaultDemoFilters = {
  envs: ['dev', 'staging', 'prod'],
  range: '30d',
  entityRange: 'all',
  gran: 'day',
  lens: 'cost',
  compare: false,
  client: null,
  twin: null,
  user: null,
  service: null,
  vendor: null,
};

export function twinShare(twin) {
  const siblings = data.TWINS.filter((entry) => entry.clientId === twin.clientId);
  const total = siblings.reduce((sum, entry) => sum + entry.weight, 0);
  return twin.weight / total;
}

export function userShare(user) {
  const siblings = data.USERS.filter((entry) => entry.clientId === user.clientId);
  const total = siblings.reduce((sum, entry) => sum + entry.weight, 0);
  return user.weight / total;
}

export function selectFacts(filters = defaultDemoFilters, overrides = {}) {
  const days = RANGE_DAYS[filters.range];
  const minDay = data.DAYS - days;
  const envs = overrides.envs || filters.envs;

  return data.facts.filter(
    (row) =>
      envs.includes(row.env) &&
      row.day >= minDay &&
      (overrides.client ? row.clientId === overrides.client : !filters.client || row.clientId === filters.client) &&
      (overrides.service ? row.service === overrides.service : !filters.service || row.service === filters.service),
  );
}

export function entityMultiplier(filters = defaultDemoFilters) {
  let multiplier = 1;

  if (filters.twin) {
    const twin = data.byId.twin(filters.twin);
    if (twin) {
      multiplier *= twinShare(twin);
    }
  }

  if (filters.user) {
    const user = data.byId.user(filters.user);
    if (user) {
      multiplier *= userShare(user);
    }
  }

  return multiplier;
}

export function sumMetric(rows, key, filters = defaultDemoFilters, vendorId = null) {
  const multiplier = entityMultiplier(filters);
  const total = rows.reduce((sum, row) => {
    if (vendorId) {
      return sum + (row.vendorCost[vendorId] || 0);
    }
    return sum + (row[key] || 0);
  }, 0);

  return total * multiplier;
}

export function timeSeries(rows, key, filters = defaultDemoFilters, vendorId = null) {
  const buckets = {};
  const order = [];
  const multiplier = entityMultiplier(filters);

  rows.forEach((row) => {
    const date = new Date(`${row.date}T00:00:00Z`);
    let label;

    if (filters.gran === 'month') {
      label = row.date.slice(0, 7);
    } else if (filters.gran === 'week') {
      label = `W${Math.floor(row.day / 7)}`;
    } else {
      label = row.date.slice(5);
    }

    if (!(label in buckets)) {
      buckets[label] = 0;
      order.push(label);
    }

    buckets[label] += vendorId ? row.vendorCost[vendorId] || 0 : row[key] || 0;
  });

  order.sort();
  return {
    labels: order,
    values: order.map((label) => buckets[label] * multiplier),
  };
}

export function groupBy(rows, dimension, key, filters = defaultDemoFilters, vendorId = null) {
  const buckets = {};
  const multiplier = entityMultiplier(filters);

  rows.forEach((row) => {
    const id = row[dimension];
    if (!buckets[id]) {
      buckets[id] = 0;
    }
    buckets[id] += vendorId ? row.vendorCost[vendorId] || 0 : row[key] || 0;
  });

  return Object.entries(buckets)
    .map(([id, value]) => ({ id, value: value * multiplier }))
    .sort((left, right) => right.value - left.value);
}
