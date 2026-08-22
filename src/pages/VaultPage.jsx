import { useContext, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bot, Database, Gauge, Package, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { TopUsersTable } from '../components/vault/TopUsersTable';
import { FilterContext } from '../app/FilterContext';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { StorageByClientCard } from '../components/vault/StorageByClientCard';
import { VaultQuotaCard } from '../components/vault/VaultQuotaCard';
import { dashboardService, getFilebaseTopUsers, getStorageByClient, getStorageUsage } from '../services';
import { formatNumber } from '../utils/dashboardUtils';
import {
  exportTopUsersCsv,
  firstNumber,
  formatBytes,
  normalizeStorageUsage,
  normalizeStorageClient,
  normalizeTopUser,
  sortTopUsers,
} from '../utils/vaultFormatters';

export function VaultPage() {
  const { filters, setFilters } = useContext(FilterContext);
  const [stats, setStats] = useState(null);
  const [filebaseQuota, setFilebaseQuota] = useState(null);
  const [storageClients, setStorageClients] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'storage', direction: 'desc' });

  const vaultRequestParams = useMemo(() => (
    filters.envs.length === 1
      ? { env: filters.envs[0] }
      : {}
  ), [filters.envs]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(false);

    async function load() {
      const [statsResult, usersResult, quotaResult, clientsResult] =
        await Promise.allSettled([
          dashboardService.getEntityVaultStats(vaultRequestParams),
          getFilebaseTopUsers(vaultRequestParams),
          getStorageUsage(vaultRequestParams),
          getStorageByClient(vaultRequestParams),
        ]);

      if (!active) return;

      if ([statsResult, usersResult, quotaResult, clientsResult].every((result) => result.status === 'rejected')) {
        setLoadError(true);
      }

      if (statsResult.status === 'fulfilled') {
        const statsData = statsResult.value;
        setStats(statsData?.data || statsData);
      } else {
        console.error('Vault stats load failed:', statsResult.reason);
      }

      if (usersResult.status === 'fulfilled') {
        setTopUsers(usersResult.value.map(normalizeTopUser));
      } else {
        console.error('Top users by storage load failed:', usersResult.reason);
      }

      if (quotaResult.status === 'fulfilled') {
        setFilebaseQuota(quotaResult.value);
      } else {
        console.error('Storage usage load failed:', quotaResult.reason);
      }

      if (clientsResult.status === 'fulfilled') {
        setStorageClients(clientsResult.value.map(normalizeStorageClient));
      } else {
        console.error('Storage by client load failed:', clientsResult.reason);
      }

      setIsLoading(false);
    }

    load();
    return () => { active = false; };
  }, [reloadKey, vaultRequestParams]);

  const kpis = stats?.kpis || {};
  const sortedUsers = sortTopUsers(topUsers, sortConfig);

  const toggleSort = (key) => {
    setSortConfig((prev) => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'user' ? 'asc' : 'desc' });
  };
  const storageUsed = kpis.storedOnIpfsGB ?? 0;
  const storageLimit = kpis.storageLimitGB ?? 0;
  const quotaPercent = filebaseQuota?.data?.percentage ?? 0;
  const activeDrives = Number(kpis.activeDrives || 0);
  const totalFiles = Number(kpis.totalFiles || 0);
  const totalBots = firstNumber(kpis.totalBots, kpis.bots, stats?.totalBots, stats?.bots) ?? 0;
  const overviewMetrics = [
    { label: 'Stored on IPFS', value: `${storageUsed} GB`, icon: Database, tone: 'indigo' },
    { label: 'Total bots', value: formatNumber(totalBots), icon: Bot, tone: 'sky' },
    { label: 'Total files', value: formatNumber(totalFiles), icon: Package, tone: 'violet' },
    { label: 'Active drives · users', value: String(activeDrives), icon: Users, tone: 'rose' },
    { label: 'Quota utilization', value: `${Number(quotaPercent || 0).toFixed(1)}%`, icon: Gauge, tone: 'indigo' },
    { label: 'Available capacity', value: `${formatNumber(Math.max(0, storageLimit - storageUsed))} GB`, icon: Database, tone: 'sky' },
  ];

  if (isLoading) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <div>
            <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-panel" />)}
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-panel">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><AlertCircle size={22} /></span>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Vault data could not be loaded</h1>
          <p className="mt-1 max-w-md text-sm text-slate-500">Check the Vault services or retry the request. No Twin data will be used as a fallback.</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"><RefreshCw size={15} />Retry</button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Vault Overview</h1>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">Storage health, capacity, files, active drives, and top users across the Vault platform.</p>
          </div>
          <div className="w-full xl:w-64">
            <FilterDropdown
              value={filters.envs.length === 1 ? filters.envs[0] : null}
              onChange={(value) => setFilters((current) => ({ ...current, envs: value ? [value] : ['dev', 'staging', 'prod'] }))}
              options={[{ value: 'dev', label: 'Development' }, { value: 'staging', label: 'Staging' }, { value: 'prod', label: 'Production' }]}
              placeholder="All environments"
              searchPlaceholder="Search environment..."
              searchable={false}
              tone="vault"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overviewMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
              <div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone === 'sky' ? 'bg-sky-50 text-sky-500' : metric.tone === 'violet' ? 'bg-violet-50 text-violet-500' : metric.tone === 'rose' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  <Icon size={18} />
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-800">{metric.value}</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">{metric.label}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <VaultQuotaCard percentage={filebaseQuota?.data?.percentage} storageUsed={filebaseQuota?.data?.usedGB ?? 0} storageLimit={filebaseQuota?.quotaTB ?? 0} />
        <StorageByClientCard clients={storageClients} />
      </div>

      <div>
        <TopUsersTable
          users={sortedUsers}
          sortConfig={sortConfig}
          onSort={toggleSort}
          onExport={() => exportTopUsersCsv(sortedUsers)}
        />
      </div>
    </section>
  );
}
