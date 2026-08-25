import { useContext, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Coins,
  MessagesSquare,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dashboardService } from '../services';
import { useAuth } from '../app/AuthContext';
import { FilterContext } from '../app/FilterContext';
import { envBadge, formatCurrency, formatCurrencyUpToFourDecimals, formatNumber, ServiceUsageRow } from '../utils/dashboardUtils';
import { formatCurrencyUpToTwoDecimals } from '../utils/formatters';

const DETAIL_PAGE_SIZE = 10;

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim().slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatLastActive(daysAgo) {
  return daysAgo <= 0 ? 'today' : `${daysAgo}d ago`;
}

function getVaultId(userId) {
  let hash = 2166136261;

  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `vx_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const toneStyles = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
};

const avatarTone = {
  client: 'bg-blue-100 text-blue-600',
  vaultClient: 'bg-emerald-100 text-emerald-700',
  twin: 'bg-purple-100 text-purple-600',
  user: 'bg-indigo-100 text-indigo-600',
};

function MetricCard({ icon: Icon, label, value, meta, tone = 'indigo' }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneStyles[tone] || toneStyles.indigo}`}>
          <Icon size={16} />
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
      {meta ? <span className="mt-1 block text-xs text-slate-400">{meta}</span> : null}
    </article>
  );
}

function DetailHeader({ avatarClassName, initials, title, subtitle, onBack }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900" onClick={onBack}>
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="flex min-w-0 items-center gap-3.5">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-bold shadow-sm ${avatarTone[avatarClassName] || avatarClassName}`}>{initials}</span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">{subtitle}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function CardSection({ title, subtitle, children, flush = false }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          {subtitle ? <span className="mt-0.5 block text-xs text-slate-400">{subtitle}</span> : null}
        </div>
      </div>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

function EntityListRow({ avatarClassName, initials, title, subtitle, meta, onClick }) {
  return (
    <button type="button" className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 text-left transition hover:bg-slate-50 last:border-b-0" onClick={onClick}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${avatarTone[avatarClassName] || avatarClassName}`}>{initials}</span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-semibold text-slate-800">{title}</strong>
          <span className="block truncate text-xs text-slate-400">{subtitle}</span>
        </span>
      </div>
      {meta ? <span className="shrink-0 text-xs font-medium text-slate-400">{meta}</span> : null}
    </button>
  );
}

function EmptyDetailState({ message }) {
  return <div className="py-12 text-center text-sm text-slate-400">{message}</div>;
}

function DetailPagination({ currentPage, itemCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(itemCount / DETAIL_PAGE_SIZE));
  const pageStart = itemCount === 0 ? 0 : (currentPage - 1) * DETAIL_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * DETAIL_PAGE_SIZE, itemCount);

  if (itemCount === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-sm text-slate-400">
      <span>{pageStart}-{pageEnd} of {itemCount}</span>
      <div className="flex items-center gap-2 font-medium text-slate-600">
        <button
          type="button"
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft size={14} />
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button
          type="button"
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function parseDecimal(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'object' && '$numberDecimal' in value) return Number(value.$numberDecimal) || 0;
  return 0;
}

function firstDecimal(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const parsed = typeof value === 'object' && '$numberDecimal' in value ? Number(value.$numberDecimal) : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export const formatOptionalCurrency = (value) => value == null ? '---' : formatCurrency(value);
export const formatOptionalNumber = (value) => value == null ? '---' : formatNumber(value);

const serviceLabels = {
  openai: 'OpenAI', elevenlabs: 'ElevenLabs', did: 'D-ID', heygen: 'HeyGen',
  apify: 'Apify', filebase: 'Filebase / IPFS', s3ses: 'AWS S3 + SES', aws: 'AWS S3 + SES', blockchain: 'Polygon gas',
  polygon: 'Polygon gas', stripe: 'Stripe', moonpay: 'MoonPay',
};

// Frontend-only preview data shared by Client and Twin details. Remove this
// fallback when their APIs return per-service usage and cost breakdowns.
const demoServiceUsageRows = [
  { key: 'elevenlabs', label: 'ElevenLabs', units: 8400, unitLabel: 'chars', cost: 1.43 },
  // { key: 'filebase', label: 'Filebase / IPFS', units: 50.02, unitLabel: 'GB', cost: 0.30 },
  { key: 'openai', label: 'OpenAI', units: 31000, unitLabel: 'tokens', cost: 0.42 },
  { key: 'did', label: 'D-ID', units: 12, unitLabel: 'min', cost: 3.36 },
  // { key: 'stripe', label: 'Stripe', units: 7, unitLabel: 'txn', cost: 1.05 },
  // { key: 's3ses', label: 'AWS S3 + SES', units: 3.8, unitLabel: 'GB', cost: 0.18 },
];

function getServiceUsageRows(clientData) {
  const usage = clientData?.usage || {};
  const costSources = [
    clientData?.serviceCosts, clientData?.vendorCost, clientData?.costs,
    usage?.serviceCosts, usage?.vendorCost, usage?.costs,
  ].filter((source) => source && typeof source === 'object' && !Array.isArray(source));
  const usageSources = [
    usage?.byService, usage?.services, usage?.usageByService,
    clientData?.serviceUsage, clientData?.usageByService, clientData?.servicesUsage,
  ]
    .filter((source) => source && typeof source === 'object');
  const rows = new Map();
  const add = (rawKey, details = {}, explicitCost = null) => {
    const key = String(rawKey || details?.id || details?.key || details?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || key === 'total') return;
    const cost = explicitCost ?? firstDecimal(details?.cost, details?.totalCost, details?.amount, details?.costUsd, details?.costUSD);
    const units = firstDecimal(details?.usage, details?.units, details?.count, details?.calls, details?.tokens, details?.minutes, details?.characters);
    if (!(cost > 0) && !(units > 0)) return;
    const previous = rows.get(key) || {};
    rows.set(key, {
      key,
      label: details?.label || details?.name || serviceLabels[key] || rawKey,
      cost: cost ?? previous.cost ?? null,
      units: units ?? previous.units ?? null,
      unitLabel: details?.unitLabel || details?.unit || previous.unitLabel || '',
    });
  };

  costSources.forEach((source) => Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object') add(key, value);
    else add(key, {}, firstDecimal(value));
  }));
  usageSources.forEach((source) => {
    const entries = Array.isArray(source) ? source.map((item) => [item?.id || item?.key || item?.name, item]) : Object.entries(source);
    entries.forEach(([key, value]) => add(key, value && typeof value === 'object' ? value : { usage: value }));
  });

  return [...rows.values()].sort((left, right) => (right.cost ?? 0) - (left.cost ?? 0));
}

export function ClientDetailPage() {
  const { adminProduct } = useAuth();
  const { filters } = useContext(FilterContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestedTab = searchParams.get('tab');
  const selectedEnv = searchParams.get('env') || '';
  const clientTabs = ['overview'];
  const initialTab = clientTabs.includes(requestedTab) ? requestedTab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [tabData, setTabData] = useState({ twins: null, users: null, vault: null });
  const [tabLoading, setTabLoading] = useState('');
  const [tabPages, setTabPages] = useState({ twins: 1, users: 1, vault: 1 });

  useEffect(() => {
    if (!filters.client || String(filters.client) === String(clientId)) return;
    navigate(`/clients/${filters.client}${location.search}`, {
      replace: true,
      state: location.state,
    });
  }, [clientId, filters.client, location.search, location.state, navigate]);

  useEffect(() => {
    let isActive = true;

    async function loadClient() {
      setIsLoading(true);
      setClientData(null);
      try {
        const response = await dashboardService.getEntityClientById(clientId, {
          env: selectedEnv || undefined,
        });
        if (!isActive) return;
        const payload = response?.data || response;
        setClientData(payload);
      } catch (error) {
        console.error('GET /entities/clients/:id failed:', error);
        if (isActive) setClientData(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadClient();
    setTabData({ twins: null, users: null, vault: null });
    setTabPages({ twins: 1, users: 1, vault: 1 });
    return () => { isActive = false; };
  }, [clientId, selectedEnv]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', tab);
      return next;
    });
  };

  useEffect(() => {
    if (!clientId || !activeTab) return undefined;
    if (['overview', 'services', 'cost', 'timeline'].includes(activeTab)) return undefined;

    if (tabData[activeTab] !== null) return undefined;

    let isActive = true;
    setTabLoading(activeTab);

    const fetchers = {
      twins: () => dashboardService.getEntityClientTwins(clientId, { env: selectedEnv || undefined }),
      users: () => dashboardService.getEntityClientUsers(clientId, { env: selectedEnv || undefined }),
      vault: () => dashboardService.getEntityClientVault(clientId, { env: selectedEnv || undefined }),
    };

    const fetcher = fetchers[activeTab];
    if (!fetcher) return undefined;

    fetcher()
      .then((response) => {
        if (!isActive) return;
        const payload = response?.data || response;
        setTabData((prev) => ({ ...prev, [activeTab]: payload }));
      })
      .catch((error) => {
        console.error(`GET client ${activeTab} tab failed:`, error);
        if (isActive) setTabData((prev) => ({ ...prev, [activeTab]: [] }));
      })
      .finally(() => {
        if (isActive) setTabLoading('');
      });

    return () => { isActive = false; };
  }, [activeTab, clientId, selectedEnv, tabData]);

  if (isLoading) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Loading client...</div>
      </section>
    );
  }

  if (!clientData) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Client not found.</div>
      </section>
    );
  }

  const { profile, kpis, usage } = clientData;
  const openAiCost = firstDecimal(usage?.openaiCost, usage?.openAICost, usage?.openAiCost, usage?.open_ai_cost, kpis?.openaiCost, kpis?.openAICost, kpis?.open_ai_cost, clientData?.costs?.openai);
  const didCost = firstDecimal(usage?.didCost, usage?.didUsageCost, usage?.did_cost, kpis?.didCost, kpis?.didUsageCost, kpis?.did_cost, clientData?.costs?.did);
  const totalCost = firstDecimal(kpis?.cost, kpis?.totalCost, usage?.cost, usage?.totalCost, clientData?.costs?.total)
    ?? (openAiCost != null || didCost != null ? (openAiCost ?? 0) + (didCost ?? 0) : null);
  const apiServiceUsageRows = getServiceUsageRows(clientData);
  const serviceUsageRows = apiServiceUsageRows;
  if (openAiCost > 0 && !serviceUsageRows.some((row) => row.key === 'openai')) serviceUsageRows.push({ key: 'openai', label: 'OpenAI', cost: openAiCost });
  if (didCost > 0 && !serviceUsageRows.some((row) => row.key === 'did')) serviceUsageRows.push({ key: 'did', label: 'D-ID', cost: didCost });
  const displayedTotalCost = totalCost;
  const twins = tabData.twins?.twins || [];
  const users = tabData.users?.users || [];
  const vault = tabData.vault?.vault || [];
  const paginatedTwins = twins.slice((tabPages.twins - 1) * DETAIL_PAGE_SIZE, tabPages.twins * DETAIL_PAGE_SIZE);
  const paginatedUsers = users.slice((tabPages.users - 1) * DETAIL_PAGE_SIZE, tabPages.users * DETAIL_PAGE_SIZE);
  const paginatedVault = vault.slice((tabPages.vault - 1) * DETAIL_PAGE_SIZE, tabPages.vault * DETAIL_PAGE_SIZE);
  const setTabPage = (tab, page) => setTabPages((current) => ({ ...current, [tab]: page }));
  const clientName = profile?.name || profile?.organizationName || '';
  const plan = profile?.plan || '';
  const clientRevenue = firstDecimal(kpis?.revenue, kpis?.totalRevenue, clientData?.revenue, clientData?.totalRevenue);
  const costsBreakdown = kpis?.costs ?? clientData?.costs;
  const costsTotal = costsBreakdown && typeof costsBreakdown === 'object'
    ? Object.values(costsBreakdown).reduce((sum, value) => sum + (firstDecimal(value) ?? 0), 0)
    : null;
  const clientCost = firstDecimal(kpis?.cost, kpis?.totalCost, clientData?.cost, clientData?.totalCost, usage?.cost, usage?.totalCost) ?? costsTotal;
  const clientUsersCount = firstDecimal(kpis?.vaultUsers, kpis?.userCount, kpis?.usersCount, clientData?.userCount, clientData?.usersCount);
  const vaultFilesCount = firstDecimal(kpis?.filesStored, kpis?.totalFiles);
  const vaultStorageGB = firstDecimal(kpis?.storageUsedGB);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const num = Number(bytes);
    if (num >= 1099511627776) return `${(num / 1099511627776).toFixed(2)} TB`;
    if (num >= 1073741824) return `${(num / 1073741824).toFixed(2)} GB`;
    if (num >= 1048576) return `${(num / 1048576).toFixed(1)} MB`;
    if (num >= 1024) return `${(num / 1024).toFixed(0)} KB`;
    return `${num} B`;
  };

  const vaultStorageLabel = vaultStorageGB == null
    ? formatBytes(kpis?.storedOnIpfsBytes || 0)
    : vaultStorageGB >= 1024
      ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(vaultStorageGB / 1024)} TB`
      : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(vaultStorageGB)} GB`;

  const formatDateShort = (val) => {
    if (!val) return '-';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '-';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
  };

  const tabs = clientTabs;
  const vaultStorage = vault.reduce((sum, item) => sum + Number(item.storageUsed || 0), 0);
  const vaultLimit = vault.reduce((sum, item) => sum + Number(item.storageLimit || 0), 0);
  const vaultFiles = vault.reduce((sum, item) => sum + Number(item.filesCount || 0), 0);

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <DetailHeader
        avatarClassName={adminProduct === 'vault' ? 'vaultClient' : 'client'}
        initials={getInitials(clientName)}
        title={clientName}
        subtitle={adminProduct === 'vault' ? 'Vault client' : `${profile?.organizationName || ''} · ${plan} plan`}
        onBack={() => navigate(location.state?.from || '/clients')}
      />

      {adminProduct === 'vault' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard icon={TrendingUp} label="Revenue" value={formatOptionalCurrency(clientRevenue)} tone="emerald" />
          <MetricCard icon={Wallet} label="Cost" value={formatOptionalCurrency(clientCost)} tone="rose" />
          <MetricCard icon={Users} label="Users" value={formatOptionalNumber(clientUsersCount)} tone="indigo" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(kpis?.revenue || 0)} tone="emerald" />
          <MetricCard icon={Wallet} label="Cost" value={formatOptionalCurrency(displayedTotalCost)} tone="rose" />
          <MetricCard icon={Bot} label="Twins" value={String(kpis?.twinsCount || 0)} tone="indigo" />
          <MetricCard icon={Users} label="Users" value={String(kpis?.usersCount || 0)} tone="amber" />
        </div>
      )}

      {clientTabs.length > 1 ? <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold capitalize transition ${activeTab === tab ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            onClick={() => selectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div> : null}

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSection title="Client info" flush>
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Name</span><strong className="font-semibold text-slate-700">{clientName || '-'}</strong></div>
              {adminProduct !== 'vault' ? <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Organization</span><strong className="font-semibold text-slate-700">{profile?.organizationName || '-'}</strong></div> : null}
              {adminProduct !== 'vault' ? <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Email</span><strong className="font-semibold text-slate-700">{profile?.email || '-'}</strong></div> : null}
              {adminProduct !== 'vault' ? <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Plan</span><strong className="font-semibold text-slate-700">{plan || '-'}</strong></div> : null}
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Environment</span><strong className="font-semibold text-slate-700">{profile?.env || '-'}</strong></div>
            </div>
          </CardSection>
          <CardSection title={adminProduct === 'vault' ? 'Vault summary' : 'All-service usage & cost'} flush>
            <div className="divide-y divide-slate-100">
              {adminProduct === 'vault' ? (
                <>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Active drives</span><strong className="font-semibold text-slate-700">{formatNumber(kpis?.activeDrives || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Files stored</span><strong className="font-semibold text-slate-700">{formatOptionalNumber(vaultFilesCount)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Storage used</span><strong className="font-semibold text-slate-700">{vaultStorageLabel}</strong></div>
                </>
              ) : (
                // <>
                //   <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 bg-slate-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                //     <span>Service used</span><span className="text-right">Usage</span><span className="w-20 text-right">Cost</span>
                //   </div>
                //   {serviceUsageRows.map((service) => (
                //     <div key={service.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-3 text-xs">
                //       <strong className="truncate font-semibold text-slate-700">{service.label}</strong>
                //       <span className="text-right tabular-nums text-slate-500">{service.units == null ? '---' : `${formatNumber(service.units)}${service.unitLabel ? ` ${service.unitLabel}` : ''}`}</span>
                //       <strong className="w-20 text-right font-semibold tabular-nums text-slate-800">{formatOptionalCurrency(service.cost)}</strong>
                //     </div>
                //   ))}
                //   {serviceUsageRows.length === 0 ? <EmptyDetailState message="Service usage and cost data was not returned by the API." /> : null}
                //   <div className="flex items-center justify-between bg-slate-50/70 px-5 py-3 text-xs"><span className="font-semibold text-slate-500">Total cost</span><strong className="font-bold text-slate-900">{formatOptionalCurrency(displayedTotalCost)}</strong></div>
                // </>
                <>
                  <div className="divide-y divide-slate-100">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 bg-slate-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Service used</span><span className="text-right">Usage</span><span className="w-20 text-right">Cost</span>
                    </div>
                    <ServiceUsageRow label="OpenAI" cost={ 0} />
                    <ServiceUsageRow label="ElevenLabs" cost={0} />
                    <ServiceUsageRow label="D-ID" cost={0} />
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 bg-slate-50/70 px-5 py-3 text-xs">
                      <span className="font-semibold text-slate-500">Total cost</span>
                      <span />
                      <strong className="w-20 text-right font-bold tabular-nums text-slate-900">{formatOptionalCurrency(0)}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardSection>
        </div>
      ) : null}

      {activeTab === 'twins' && tabLoading === 'twins' ? (
        <CardSection title="Twins" flush><EmptyDetailState message="Loading twins..." /></CardSection>
      ) : null}

      {activeTab === 'twins' && tabLoading !== 'twins' ? (
        <CardSection title={`${twins?.length || 0} twins`} flush>
          {twins?.length ? (
            <div className="w-full text-xs">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3 font-bold uppercase tracking-wider text-slate-400">
                <span className="flex-1">Twin</span>
                <span className="w-28 text-right">Est. Cost</span>
                <span className="w-20 text-right">Share</span>
              </div>
              {paginatedTwins.map((twin) => (
                <div
                  key={twin._id}
                  className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-5 py-3.5 transition hover:bg-slate-50"
                  onClick={() => navigate(`/twins/${twin._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/twins/${twin._id}`)}
                >
                  <span className="flex flex-1 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-purple-100 text-xs font-bold text-purple-600">{getInitials(twin.name || '')}</span>
                    <span>
                      <strong className="block text-sm font-semibold text-slate-800">{twin.name || 'Unnamed'}</strong>
                      {twin.role ? <span className="block text-xs text-slate-400">{twin.role}</span> : null}
                    </span>
                  </span>
                  <span className="w-28 text-right font-medium text-slate-600">{formatCurrency(twin.estCost || 0)}</span>
                  <span className="w-20 text-right font-medium text-slate-600">{twin.share || 0}%</span>
                </div>
              ))}
              <DetailPagination
                currentPage={tabPages.twins}
                itemCount={twins.length}
                onPageChange={(page) => setTabPage('twins', page)}
              />
            </div>
          ) : (
            <EmptyDetailState message="No twins found for this client." />
          )}
        </CardSection>
      ) : null}

      {activeTab === 'users' && tabLoading === 'users' ? (
        <CardSection title="Users" flush><EmptyDetailState message="Loading users..." /></CardSection>
      ) : null}

      {activeTab === 'users' && tabLoading !== 'users' ? (
        <CardSection title={`${users?.length || 0} users`} flush>
          {users?.length ? (
            <div className="w-full text-xs">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3 font-bold uppercase tracking-wider text-slate-400">
                <span className="flex-1">User</span>
                <span className="w-20">Env</span>
                <span className="w-24 text-right">Points</span>
                {adminProduct !== 'vault' ? <span className="w-24 text-right">Twins used</span> : null}
              </div>
              {paginatedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-5 py-3.5 transition hover:bg-slate-50"
                  onClick={() => navigate(`/users/${user._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/users/${user._id}`)}
                >
                  <span className="flex flex-1 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-600">{getInitials(user.name || '')}</span>
                    <span>
                      <strong className="block text-sm font-semibold text-slate-800">{user.name || 'Unnamed'}</strong>
                      <span className="block text-xs text-slate-400">{user.email || ''}</span>
                    </span>
                  </span>
                  <span className="w-20">{envBadge(user.env)}</span>
                  <span className="w-24 text-right font-medium text-slate-600">{formatNumber(parseDecimal(user.points))}</span>
                  {adminProduct !== 'vault' ? <span className="w-24 text-right font-medium text-slate-600">{user.twinsUsed || 0}</span> : null}
                </div>
              ))}
              <DetailPagination
                currentPage={tabPages.users}
                itemCount={users.length}
                onPageChange={(page) => setTabPage('users', page)}
              />
            </div>
          ) : (
            <EmptyDetailState message="No users found for this client." />
          )}
        </CardSection>
      ) : null}

      {activeTab === 'services' ? (
        <CardSection title="Services" flush>
          <EmptyDetailState message="A client service-breakdown API is not available, so no estimated values are shown." />
        </CardSection>
      ) : null}

      {activeTab === 'vault' && tabLoading === 'vault' ? (
        <CardSection title="Vault" flush><EmptyDetailState message="Loading vault data..." /></CardSection>
      ) : null}

      {activeTab === 'vault' && tabLoading !== 'vault' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard icon={Activity} label="Stored on IPFS" value={formatBytes(vaultStorage)} tone="indigo" />
            <MetricCard icon={BookOpen} label="Files pinned" value={formatNumber(vaultFiles)} tone="sky" />
            <MetricCard icon={Users} label="Active drives · users" value={String(vault?.filter((v) => Number(v.storageUsed || 0) > 0).length || 0)} tone="rose" />
            <MetricCard icon={Wallet} label="Storage limit" value={formatBytes(vaultLimit)} tone="violet" />
            <MetricCard icon={TrendingUp} label="Drives" value={formatNumber(vault.length)} tone="emerald" />
            <MetricCard icon={Percent} label="Average storage" value={formatBytes(vault.length ? vaultStorage / vault.length : 0)} tone="amber" />
          </div>
        </>
      ) : null}

      {activeTab === 'vault' && tabLoading !== 'vault' ? (
        <CardSection title="Vault drives" subtitle={`${vault.length} records returned by the client vault API`} flush>
          {vault.length ? (
            <div className="w-full text-xs">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3 font-bold uppercase tracking-wider text-slate-400">
                <span className="flex-1">User / drive</span><span className="w-28 text-right">Storage</span><span className="w-28 text-right">Limit</span><span className="w-24 text-right">Files</span>
              </div>
              {paginatedVault.map((drive, index) => (
                <div key={drive._id || drive.userId || index} className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 transition hover:bg-slate-50">
                  <span className="flex-1 font-semibold text-slate-800">{drive.name || drive.userName || drive.email || drive.vaultId || 'Vault drive'}</span>
                  <span className="w-28 text-right font-semibold text-slate-700">{formatBytes(drive.storageUsed || 0)}</span>
                  <span className="w-28 text-right text-slate-500">{formatBytes(drive.storageLimit || 0)}</span>
                  <span className="w-24 text-right text-slate-500">{formatNumber(drive.filesCount || 0)}</span>
                </div>
              ))}
              <DetailPagination
                currentPage={tabPages.vault}
                itemCount={vault.length}
                onPageChange={(page) => setTabPage('vault', page)}
              />
            </div>
          ) : <EmptyDetailState message="No vault records found for this client." />}
        </CardSection>
      ) : null}

      {activeTab === 'cost' ? (
        <CardSection title="Cost breakdown" flush>
          <EmptyDetailState message="A client vendor-cost breakdown API is not available, so no estimated values are shown." />
        </CardSection>
      ) : null}

      {activeTab === 'timeline' ? (
        <CardSection title="Recent activity" flush>
          <EmptyDetailState message="A client activity-timeline API is not available, so no generated events are shown." />
        </CardSection>
      ) : null}
    </section>
  );
}

export function TwinDetailPage() {
  const navigate = useNavigate();
  const { twinId } = useParams();
  const [searchParams] = useSearchParams();
  const selectedEnv = searchParams.get('env') || '';
  const [twinData, setTwinData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const response = await dashboardService.getEntityTwinById(twinId, {
          env: selectedEnv || undefined,
        });
        if (!active) return;
        setTwinData(response?.data || response);
      } catch (err) {
        console.error('GET /entities/twins/:id failed:', err);
        if (active) setTwinData(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [selectedEnv, twinId]);

  if (isLoading) return <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Loading twin...</div></section>;
  if (!twinData) return <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Twin not found.</div></section>;

  const { profile, kpis, usage } = twinData;
  const apiServiceUsageRows = getServiceUsageRows(twinData);
  const associatedUserNames = (Array.isArray(profile?.associatedUsers)
    ? profile.associatedUsers
    : []
  )
    .map((user) => user?.name)
    .filter(Boolean)
    .join(', ');
  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <DetailHeader
        avatarClassName="twin"
        initials={getInitials(profile?.name || '')}
        title={profile?.name || 'Unnamed'}
        subtitle={`${profile?.role || ''} · ${profile?.clientName || ''}`}
        onBack={() => navigate('/twins')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(kpis?.revenue || 0)} tone="emerald" />
        {/* <MetricCard icon={Wallet} label="Cost" value={formatCurrency(kpis?.cost || 0)} tone="rose" /> */}
        <MetricCard icon={MessagesSquare} label="Messages" value={formatNumber(kpis?.messages || kpis?.messagesCount || 0)} tone="indigo" />
        <MetricCard icon={BookOpen} label="Knowledge Files" value={formatNumber(kpis?.knowledgeFiles || kpis?.knowledgeSources || kpis?.sourcesCount || 0)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <CardSection title="Twin Info" flush>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Name</span><strong className="font-semibold text-slate-700">{profile?.name || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Role</span><strong className="font-semibold text-slate-700">{profile?.role || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Client</span><strong className="font-semibold text-slate-700">{profile?.clientName || '-'}</strong></div>
            <div className="flex items-start justify-between gap-6 px-5 py-3 text-xs">
              <span className="shrink-0 text-slate-400">Associated Users</span>
              <strong
                className="min-w-0 max-w-[70%] text-right font-semibold text-slate-700 break-words"
                title={associatedUserNames || undefined}
              >
                {associatedUserNames || '---'}
              </strong>
            </div>
          </div>
        </CardSection>
      </div>
    </section>
  );
}

export function UserDetailPage() {
  const { adminProduct } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const selectedEnv = searchParams.get('env') || '';
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBotsModalOpen, setIsBotsModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        let response;

        if (adminProduct === "vault") {
          try {
            response = await dashboardService.getEntityVaultUserById(userId);
          } catch (vaultError) {
            console.warn(
              "GET /entities/vault-users/:id failed; trying shared user endpoint:",
              vaultError,
            );

            try {
              response = await dashboardService.getEntityUserById(userId, {
                env: selectedEnv || undefined,
              });
            } catch (sharedError) {
              console.warn(
                "GET /entities/users/:id failed; finding user in Vault users:",
                sharedError,
              );

              const listResponse = await dashboardService.getEntityVaultUsers({
                page: 1,
                limit: 100,
                userId,
              });

              const listPayload = listResponse?.data || listResponse;

              const users = Array.isArray(listPayload)
                ? listPayload
                : listPayload?.users ||
                  listPayload?.items ||
                  listPayload?.data ||
                  [];

              response =
                users.find(
                  (user) =>
                    String(user?._id ?? user?.id ?? user?.userId) ===
                    String(userId),
                ) || null;
            }
          }
        } else {
          response = await dashboardService.getEntityUserById(userId, {
            env: selectedEnv || undefined,
          });
        }

        if (!active) return;

        const payload = response?.data || response;

        if (!payload) {
          setUserData(null);
          return;
        }

        const fullName = [payload.firstName, payload.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        setUserData(
          payload.profile
            ? payload
            : {
                ...payload,

                profile: {
                  ...payload,
                  name:
                    payload.name ||
                    payload.fullName ||
                    fullName ||
                    payload.email ||
                    "",
                  clientName: payload.clientName || payload.client?.name || "",
                  env:
                    payload.__env || payload.env || payload.environment || "",
                },

                kpis:
                  payload.kpis || payload.metrics || payload.usage || payload,
              },
        );
      } catch (err) {
        console.error("GET user detail failed:", err);

        if (active) {
          setUserData(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [adminProduct, selectedEnv, userId]);

  if (isLoading) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">
          Loading user...
        </div>
      </section>
    );
  }

  if (!userData) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">
          User not found.
        </div>
      </section>
    );
  }

  const { profile, kpis, revenue, usage } = userData;
  const isVault = adminProduct === 'vault';

  const totalServiceCost = firstDecimal(kpis?.cost, usage?.totals?.cost);
  const openAiCost = firstDecimal(
    usage?.openaiCost,
    usage?.openAICost,
    kpis?.openaiCost,
    userData?.openaiCost,
  );
  const elevenLabsCost = firstDecimal(
    usage?.elevenlabsCost,
    usage?.elevenLabsCost,
    kpis?.elevenlabsCost,
    userData?.elevenlabsCost,
  );

  const primaryPackage = profile?.packageDetails?.vaultPackage ?? profile?.packageDetails?.twinPackage ?? null;
  const twinPackage = profile?.packageDetails?.twinPackage || null;

  const subscriptionPackages = Array.isArray(
    profile?.packageDetails?.subscriptionPackages,
  )
    ? profile?.packageDetails.subscriptionPackages
    : [];

  const associatedTwinsValue =
    userData?.twins ?? profile?.associatedTwins ?? [];

  const twins = Array.isArray(associatedTwinsValue)
    ? associatedTwinsValue
    : Array.isArray(associatedTwinsValue?.items)
      ? associatedTwinsValue.items
      : [];
  const botsCount = firstDecimal(
    userData?.botsCount,
    profile?.botsCount,
    kpis?.botsCount,
  );
  const associatedBotsValue =
    userData?.bots ?? profile?.bots ?? profile?.associatedBots ?? userData?.botDetails ?? [];
  const bots = Array.isArray(associatedBotsValue)
    ? associatedBotsValue
    : Array.isArray(associatedBotsValue?.items)
      ? associatedBotsValue.items
      : [];
  const displayedBotsCount = botsCount ?? bots.length;
  const revenueValue = firstDecimal(
    revenue?.totalAmount,
    revenue,
    kpis?.revenue,
    userData?.totalRevenue,
  );

  const getTwinName = (twin) => {
    if (!twin || typeof twin === "string") return "";

    return twin.name ?? twin.twinName ?? twin.label ?? twin.profile?.name ?? "";
  };

  const getBotName = (bot) => {
    if (!bot || typeof bot === 'string') return bot || '';
    return bot.name ?? bot.botName ?? bot.label ?? bot.title ?? '';
  };

  const getBotDetail = (bot) => {
    if (!bot || typeof bot === 'string') return '';
    return [bot.profession ?? bot.type ?? bot.botType ?? bot.role, bot.status]
      .filter(Boolean)
      .join(' · ');
  };

  const formatBotCreatedAt = (bot) => {
    const createdAt = bot?.createdAt;
    if (!createdAt) return '';
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatPackageDate = (value) => {
    if (!value) return 'Not provided';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Not provided'
      : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatStorageAllowance = (storageGB) => {
    const value = Number(storageGB);
    if (!Number.isFinite(value)) return 'Not provided';
    return value >= 1024 && value % 1024 === 0 ? `${value / 1024} TB` : `${formatNumber(value)} GB`;
  };

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <DetailHeader
        avatarClassName="user"
        initials={getInitials(profile?.name || "")}
        title={profile?.name || "Unnamed"}
        subtitle={
          <>
            <span>{profile?.clientName || ""}</span>
            <span>·</span>
            <span>{profile?.env || ""}</span>
          </>
        }
        onBack={() => navigate("/users")}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label="Cost"
          value={formatCurrencyUpToFourDecimals(kpis?.cost ?? 0)}
          tone="rose"
        />

        <MetricCard
          icon={TrendingUp}
          label="Revenue"
          value={isVault ? (revenueValue == null ? '---' : formatCurrencyUpToTwoDecimals(revenueValue)) : formatCurrencyUpToTwoDecimals(revenue?.totalAmount)}
          tone="emerald"
        />

        <MetricCard
          icon={Coins}
          label="Balance Points"
          value={formatOptionalNumber(
            firstDecimal(kpis?.totalPoints, kpis?.pointsBalance, kpis?.balance),
          )}
          tone="amber"
        />

        <MetricCard
          icon={Activity}
          label="Points Spent"
          value={formatOptionalNumber(firstDecimal(kpis?.pointsSpent ?? 0))}
          tone="indigo"
        />
      </div>

      {/* User Info + linked product usage */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CardSection title="User Info" flush>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-xs">
              <span className="text-slate-400">Email</span>

              <strong className="font-semibold text-slate-700">
                {profile?.email || "-"}
              </strong>
            </div>

            <div className="flex items-center justify-between px-5 py-3 text-xs">
              <span className="text-slate-400">Client</span>

              <strong className="font-semibold text-slate-700">
                {profile?.clientName || "-"}
              </strong>
            </div>

            <div className="flex items-center justify-between px-5 py-3 text-xs">
              <span className="text-slate-400">Environment</span>

              <strong className="font-semibold text-slate-700">
                {profile?.env || "-"}
              </strong>
            </div>
          </div>
        </CardSection>

        {isVault ? (
          <CardSection
            title="Bots Used"
            subtitle="Usage across this Vault account"
            flush
          >
            <div className="flex items-center justify-between gap-4 px-5 py-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100">
                  <Bot size={19} strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Total bots used</p>
                  <strong className="mt-0.5 block text-2xl font-bold tracking-tight text-slate-900">
                    {formatOptionalNumber(displayedBotsCount)}
                  </strong>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                Vault
              </span>
            </div>
            {bots.length ? (
              <div className="border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setIsBotsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                >
                  View {formatNumber(bots.length)} bots
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : displayedBotsCount === 0 ? (
              <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
                  <Bot size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-600">No bots used yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">This user has not used any Vault bots.</p>
                </div>
              </div>
            ) : botsCount == null ? (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Bot usage is unavailable.</p>
            ) : (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Individual bot details are currently unavailable.</p>
            )}
          </CardSection>
        ) : (
          <CardSection
            title="Twins Used"
            subtitle={`${twins?.length || 0} linked twins`}
            flush
          >
            {twins?.length ? (
              <div>
                {twins.map((twin) => (
                  <EntityListRow
                    key={twin._id ?? twin.id ?? twin.twinId ?? twin.name}
                    avatarClassName="twin"
                    initials={getInitials(getTwinName(twin))}
                    title={getTwinName(twin) || "Name unavailable"}
                    subtitle={twin.role || ""}
                    onClick={() =>
                      navigate(`/twins/${twin._id ?? twin.id ?? twin.twinId}`)
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyDetailState message="No twins used." />
            )}
          </CardSection>
        )}
      </div>

      {isVault && isBotsModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setIsBotsModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="bots-modal-title"
            className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="bots-modal-title" className="text-lg font-bold tracking-tight text-slate-900">Bots Used</h2>
                <p className="mt-0.5 text-sm text-slate-500">{formatNumber(bots.length)} bots associated with this Vault user</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBotsModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close bots dialog"
              >
                ×
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-2">
              {bots.map((bot, index) => (
                <div key={bot?._id ?? bot?.id ?? bot?.botId ?? `${getBotName(bot)}-${index}`} className="flex items-center gap-3 border-b border-slate-100 py-3.5 last:border-b-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
                    <Bot size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-slate-800">{getBotName(bot) || 'Unnamed bot'}</strong>
                    {getBotDetail(bot) ? <span className="mt-0.5 block truncate text-xs text-slate-500">{getBotDetail(bot)}</span> : null}
                  </div>
                  {formatBotCreatedAt(bot) ? <span className="shrink-0 text-xs text-slate-400">Created {formatBotCreatedAt(bot)}</span> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {/* Packages + All-service usage */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Packages */}
        {isVault ? (
        <CardSection title="Packages" flush>
          {primaryPackage || subscriptionPackages.length ? (
            <div className="divide-y divide-slate-100">
              {primaryPackage ? (
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-700">{primaryPackage.planName ?? primaryPackage.packagename ?? 'Vault package'}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">Vault package</div>
                  </div>
                  <strong className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">{primaryPackage.price != null ? `$${formatNumber(primaryPackage.price)}` : '---'}</strong>
                </div>
              ) : null}
              {subscriptionPackages.map((pkg, index) => {
                const status = pkg?.status ?? 'unknown';
                const isActive = String(status).toLowerCase() === 'active';
                return (
                  <div key={pkg?.id ?? `${pkg?.planName ?? pkg?.packagename ?? 'package'}-${index}`} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-700">{pkg?.planName ?? pkg?.packagename ?? 'Unnamed subscription'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">Storage package</span>
                        {pkg?.currentPeriodEnd ? <span className="text-[11px] text-slate-400">Ends on {formatPackageDate(pkg.currentPeriodEnd)}</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{String(status).charAt(0).toUpperCase() + String(status).slice(1)}</span>
                      <strong className="text-xs font-semibold tabular-nums text-slate-700">{pkg?.price != null ? `$${formatNumber(pkg.price)}` : '---'}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-36 items-center justify-center px-5 py-8">
              <div className="flex items-center gap-3.5 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
                  <BookOpen size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-600">No packages assigned</p>
                  <p className="mt-0.5 text-xs text-slate-400">This user does not have an active Vault package or subscription.</p>
                </div>
              </div>
            </div>
          )}
        </CardSection>
        ) : (
          <CardSection title="Packages" flush>
            {twinPackage || subscriptionPackages.length ? (
              <div className="divide-y divide-slate-100">
                {twinPackage ? (
                  <div className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700">{twinPackage.packagename || '---'}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">Twin Package</div>
                    </div>
                    <strong className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">{twinPackage.price != null ? `$${twinPackage.price}` : '---'}</strong>
                  </div>
                ) : null}
                {subscriptionPackages.map((pkg, index) => (
                  <div key={`${pkg?.packagename || 'package'}-${index}`} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-700">{pkg?.packagename || '---'}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{pkg?.validity || 'Subscription'}</div>
                    </div>
                    <strong className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">{pkg?.price != null ? `$${pkg.price}` : '---'}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyDetailState message="No packages assigned." />
            )}
          </CardSection>
        )}

        {/* All-service usage & cost */}
        <CardSection title="All-service usage & cost" flush>
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 bg-slate-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Service used</span>

              <span className="text-right">Usage</span>

              <span className="w-20 text-right">Cost</span>
            </div>

            {isVault ? (
              <>
                <ServiceUsageRow label="OpenAI" cost={openAiCost ?? kpis?.cost ?? usage?.totals?.cost ?? 0} />
                <ServiceUsageRow label="ElevenLabs" cost={elevenLabsCost ?? 0} />
              </>
            ) : (
              <>
                <ServiceUsageRow label="OpenAI" cost={kpis?.cost ?? usage?.totals?.cost ?? 0} />
                <ServiceUsageRow label="ElevenLabs" cost={0} />
                <ServiceUsageRow label="D-ID" cost={0} />
              </>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 bg-slate-50/70 px-5 py-3 text-xs whitespace-nowrap">
              <span className="font-semibold text-slate-500 whitespace-nowrap">
                Total cost
              </span>

              <span />

              <strong className="w-20 whitespace-nowrap text-right font-bold tabular-nums text-slate-900">
                {totalServiceCost == null
                  ? "---"
                  : formatCurrencyUpToFourDecimals(totalServiceCost)}
              </strong>
            </div>
          </div>
        </CardSection>
      </div>
    </section>
  );
}
