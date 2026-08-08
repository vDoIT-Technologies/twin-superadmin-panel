import { useContext, useEffect, useMemo, useState } from 'react';
import { Database, FileUp, Package, Users } from 'lucide-react';
import { TopUsersTable } from '../components/vault/TopUsersTable';
import { FilterContext } from '../app/FilterContext';
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
  const { filters } = useContext(FilterContext);
  const [stats, setStats] = useState(null);
  const [filebaseQuota, setFilebaseQuota] = useState(null);
  const [storageClients, setStorageClients] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'storage', direction: 'desc' });

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      const env = filters.envs.length === 1 ? filters.envs[0] : undefined;
      const params = {
        env,
        clientId: filters.client || undefined,
        twinId: filters.twin || undefined,
        userId: filters.user || undefined,
      };
      const [statsResult, usersResult, quotaResult, clientsResult] =
        await Promise.allSettled([
          dashboardService.getEntityVaultStats(params),
          getFilebaseTopUsers(params),
          getStorageUsage(params),
          getStorageByClient(params),
        ]);

      if (!active) return;

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
        setFilebaseQuota(normalizeStorageUsage(quotaResult.value));
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
  }, [filters.client, filters.envs, filters.twin, filters.user]);

  const kpis = stats?.kpis || {};
  const scopedStorageClients = useMemo(
    () => filters.client ? storageClients.filter((client) => String(client.id) === String(filters.client)) : storageClients,
    [filters.client, storageClients],
  );
  const scopedTopUsers = useMemo(
    () => filters.client ? topUsers.filter((user) => String(user.clientId) === String(filters.client)) : topUsers,
    [filters.client, topUsers],
  );
  const sortedUsers = sortTopUsers(scopedTopUsers, sortConfig);

  const toggleSort = (key) => {
    setSortConfig((prev) => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'user' ? 'asc' : 'desc' });
  };

  const storageUsed =
    filebaseQuota?.totalUsage ??
    firstNumber(kpis.storedOnIpfsBytes) ??
    0;
  const storageLimit =
    filebaseQuota?.totalQuota ??
    firstNumber(kpis.storageLimitBytes) ??
    0;
  const quotaPercent =
    filebaseQuota?.usagePercent ??
    firstNumber(kpis.quotaPercent) ??
    0;

  if (isLoading) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Vault</h1>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">Decentralised user file storage — Filebase / IPFS pinning across encrypted drives</p>
          </div>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Loading vault data...</div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Vault</h1>
          <p className="mt-1 text-sm text-slate-400 sm:text-base">Decentralised user file storage — Filebase / IPFS pinning across encrypted drives</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Stored on IPFS', value: formatBytes(storageUsed), icon: Database, tone: 'indigo' },
          { label: 'Total Bots', value: formatNumber(kpis?.bots || 0), icon: FileUp, tone: 'sky' },
          { label: 'Total files', value: formatNumber(kpis.totalFiles || 0), icon: Package, tone: 'violet' },
          { label: 'Active drives · users', value: String(kpis.activeDrives || 0), icon: Users, tone: 'rose' },
        //   { label: 'Quota used', value: formatQuotaPercent(quotaPercent), icon: Percent, tone: 'amber' },
        //   { label: 'Storage limit', value: formatBytes(storageLimit), icon: TrendingUp, tone: 'emerald' },
        ].map((metric) => {
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
        <VaultQuotaCard percentage={quotaPercent} storageUsed={storageUsed} storageLimit={storageLimit} />
        <StorageByClientCard clients={scopedStorageClients} />
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
