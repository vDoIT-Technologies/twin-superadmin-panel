import { useEffect, useState } from 'react';
import { Database, FileUp, Package, Percent, TrendingUp, Users } from 'lucide-react';
import { TopUsersTable } from '../components/vault/TopUsersTable';
import { VaultQuotaCard } from '../components/vault/VaultQuotaCard';
import { dashboardService, getFilebaseQuota, getFilebaseTopUsers } from '../services';
import { formatNumber } from '../utils/dashboardUtils';
import {
  exportTopUsersCsv,
  firstNumber,
  formatBytes,
  formatQuotaPercent,
  normalizeFilebaseQuota,
  normalizeTopUser,
  sortTopUsers,
} from '../utils/vaultFormatters';

export function VaultPage() {
  const [stats, setStats] = useState(null);
  const [filebaseQuota, setFilebaseQuota] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'storage', direction: 'desc' });

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      const [statsResult, usersResult, quotaResult] =
        await Promise.allSettled([
          dashboardService.getEntityVaultStats(),
          getFilebaseTopUsers(),
          getFilebaseQuota(),
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
        setFilebaseQuota(normalizeFilebaseQuota(quotaResult.value));
      } else {
        console.error('Filebase quota load failed:', quotaResult.reason);
      }

      setIsLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  const kpis = stats?.kpis || {};
  const sortedUsers = sortTopUsers(topUsers, sortConfig);

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

      <div className="vault-metric-grid">
        {[
          { label: 'Stored on IPFS', value: formatBytes(storageUsed), icon: Database, tone: 'indigo' },
          { label: 'Files pinned', value: formatNumber(kpis.filesPinned || 0), icon: FileUp, tone: 'sky' },
          { label: 'Total files', value: formatNumber(kpis.totalFiles || 0), icon: Package, tone: 'violet' },
          { label: 'Active drives · users', value: String(kpis.activeDrives || 0), icon: Users, tone: 'rose' },
          { label: 'Quota used', value: formatQuotaPercent(quotaPercent), icon: Percent, tone: 'amber' },
          { label: 'Storage limit', value: formatBytes(storageLimit), icon: TrendingUp, tone: 'emerald' },
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

      <VaultQuotaCard percentage={quotaPercent} storageUsed={storageUsed} storageLimit={storageLimit} />

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
