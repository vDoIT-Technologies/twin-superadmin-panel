import { superadminDemoData } from '../demo-data/superadminDemoData';
import { selectFacts, sumMetric, RANGE_DAYS } from '../demo-data/superadminSelectors';

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatCompactNumber(value) {
  return compactFormatter.format(value);
}

export function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '$0';
  return currencyFormatter.format(value);
}

export function formatCurrencyFull(value) {
  if (value == null || Number.isNaN(value)) return '$0';
  return '$' + Math.round(value).toLocaleString('en-US');
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return '0';
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return Math.round(n).toLocaleString('en-US');
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '0%';
  return `${value.toFixed(digits)}%`;
}

export function selectPreviousFacts(filters) {
  const days = RANGE_DAYS[filters.range];
  const lo = superadminDemoData.DAYS - days * 2;
  const hi = superadminDemoData.DAYS - days;

  return superadminDemoData.facts.filter((row) =>
    filters.envs.includes(row.env) &&
    row.day >= lo &&
    row.day < hi &&
    (!filters.client || row.clientId === filters.client) &&
    (!filters.service || row.service === filters.service),
  );
}

export function deltaPercent(filters, key, vendorId = null) {
  const currentRows = selectFacts(filters);
  const previousRows = selectPreviousFacts(filters);
  const currentValue = sumMetric(currentRows, key, filters, vendorId);
  const previousValue = sumMetric(previousRows, key, filters, vendorId);

  if (!previousValue) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

export function envBadge(env) {
  const meta = superadminDemoData.ENV_META[env];
  return (
    <span
      className="env-badge"
      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
    >
      <span className="env-badge-dot" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

const healthColor = {
  good: 'bg-emerald-500',
  watch: 'bg-amber-500',
  spike: 'bg-red-500',
};

export function healthDot(status) {
  const tone = healthColor[status] || 'bg-slate-300';
  return <span className={`health-dot ${tone}`} />;
}

export function getPageTitle(pathname) {
  const map = {
    '/': 'Overview',
    '/clients': 'Clients',
    '/twins': 'Twins',
    '/users': 'Users',
    '/services': 'Services',
    '/cost': 'Cost & Billing',
    '/financial': 'Cost & Billing',
    '/usage': 'Usage Analytics',
    '/telemetry': 'Telemetry',
    '/profile': 'Profile',
  };
  return map[pathname] || 'Overview';
}

export function getEnvOptions() {
  return superadminDemoData.ENVS.map((env) => ({
    id: env,
    label: superadminDemoData.ENV_META[env].label,
    color: superadminDemoData.ENV_META[env].color,
  }));
}
