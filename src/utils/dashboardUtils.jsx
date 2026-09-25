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

export function getRawNumericValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && '$numberDecimal' in value) return String(value.$numberDecimal);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  const text = String(value).trim();
  return text && Number.isFinite(Number(text)) ? text : null;
}

function groupNumericString(value) {
  const raw = getRawNumericValue(value);
  if (raw == null) return null;
  if (/e/i.test(raw)) return raw;
  const sign = raw.startsWith('-') ? '-' : '';
  const unsigned = sign ? raw.slice(1) : raw;
  const [integer, decimal] = unsigned.split('.');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${groupedInteger}${decimal == null ? '' : `.${decimal}`}`;
}

export function formatCompactNumber(value) {
  return compactFormatter.format(value);
}

export function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '$0';
  if (Number(value) === 0) return '$0.00';
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

export function formatCost(value) {
  if (value == null || value === '') return '---';
  const num = Number(
    typeof value === 'object' && '$numberDecimal' in value
      ? value.$numberDecimal
      : value,
  );
  if (!Number.isFinite(num)) return '---';
  if (num === 0) return '$0.00';

  const abs = Math.abs(num);
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(6)}B`;
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(6)}M`;
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(6)}k`;
  return `$${num.toFixed(6)}`;
}
export function formatRevenue(value) {
  if (value == null || value === '') return '---';
  const num = Number(
    typeof value === 'object' && '$numberDecimal' in value
      ? value.$numberDecimal
      : value,
  );
  if (!Number.isFinite(num)) return '---';
  if (num === 0) return '$0.00';

  const abs = Math.abs(num);
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(2)}k`;
  return `$${num.toFixed(2)}`;
}
export function formatRevenueWhole(value) {
  if (value == null || value === '') return '---';
  const num = Number(
    typeof value === 'object' && '$numberDecimal' in value
      ? value.$numberDecimal
      : value,
  );
  if (!Number.isFinite(num)) return '---';
  if (num === 0) return '$0';

  const abs = Math.abs(num);
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(1)}k`;
  return `$${Math.round(num)}`;
}
export function TruncatedValue({ value, children, className = '' }) {
  const fullValue = children ?? value ?? '---';
  return (
    <span
      className={`group relative block min-w-0 max-w-full ${className}`}
      tabIndex={0}
      aria-label={String(fullValue)}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{fullValue}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-max max-w-[min(24rem,calc(100vw-2rem))] rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 whitespace-normal text-white shadow-lg break-all group-hover:block group-focus:block"
      >
        {fullValue}
      </span>
    </span>
  );
}

export function formatNumber(value) {
  return groupNumericString(value) ?? '0';
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

export function ServiceUsageRow({ label, cost }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-3 text-xs">
      <strong className="truncate font-semibold text-slate-700">{label}</strong>
      <span />
      <strong className="w-24 min-w-0 justify-self-end text-right font-semibold tabular-nums text-slate-800 sm:w-28 lg:w-32">
        <TruncatedValue value={formatCost(cost)} className="w-full text-right" />
      </strong>
    </div>
  );
}

export function formatCurrencyUpToFourDecimals(value) {
  if (value == null || Number.isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}
