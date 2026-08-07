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
      <section className="page-section vault-page">
        <header className="vault-header">
          <div className="vault-header-copy">
            <h1>Vault</h1>
            <p>Decentralised user file storage — Filebase / IPFS pinning across encrypted drives</p>
          </div>
        </header>
        <div className="empty-state">Loading vault data...</div>
      </section>
    );
  }

  return (
    <section className="page-section vault-page">
      <header className="vault-header">
        <div className="vault-header-copy">
          <h1>Vault</h1>
          <p>Decentralised user file storage — Filebase / IPFS pinning across encrypted drives</p>
        </div>
      </header>

      <div className="vault-metric-grid vault-metric-grid-two-column">
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
            <article key={metric.label} className="table-card vault-metric-card">
              <div className="vault-metric-top">
                <span className={`vault-metric-icon vault-metric-icon-${metric.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <h2>{metric.value}</h2>
              <p>{metric.label}</p>
            </article>
          );
        })}
      </div>

      <div className="vault-storage-overview-grid">
        <VaultQuotaCard percentage={quotaPercent} storageUsed={storageUsed} storageLimit={storageLimit} />
        <StorageByClientCard clients={scopedStorageClients} />
      </div>

      <div className="vault-bottom-grid">
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
