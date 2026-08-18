import { superadminDemoData } from '../demo-data/superadminDemoData';
import { isServiceForProduct } from './productAccess';
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

const currencyFormatterTwoDecimals = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
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
  const amount = Number(value);
  const truncated = amount < 0
    ? Math.ceil(amount * 100) / 100
    : Math.floor(amount * 100) / 100;
  return truncated.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

export function formatActualNumber(n) {
  return new Intl.NumberFormat('en-US').format(n);
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

export function deltaPercent(filters, key, vendorId = null, product = null) {
  const currentRows = selectFacts(filters).filter((row) => !product || isServiceForProduct(product, row.service));
  const previousRows = selectPreviousFacts(filters).filter((row) => !product || isServiceForProduct(product, row.service));
  const currentValue = sumMetric(currentRows, key, filters, vendorId);
  const previousValue = sumMetric(previousRows, key, filters, vendorId);

  if (!previousValue) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

export function envBadge(env) {
  const meta = superadminDemoData.ENV_META[env];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
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
  return <span className={`h-2 w-2 rounded-full ${tone}`} />;
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

export function normalizeRoleName(role) {
  const rawRole = typeof role === 'string' ? role : role?.name ?? role?.label ?? '';
  return rawRole.trim().toLowerCase();
}
