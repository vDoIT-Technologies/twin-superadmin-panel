import { useEffect, useState } from 'react';
import { AlertTriangle, Database, Download, FileUp, Package, Percent, TrendingUp, Users } from 'lucide-react';
import { dashboardService, getFilebaseQuota } from '../services';
import { envBadge, formatCurrencyFull, formatNumber, formatPercent } from '../utils/dashboardUtils';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const num = Number(bytes);
  if (num >= 1099511627776) return `${(num / 1099511627776).toFixed(2)} TB`;
  if (num >= 1073741824) return `${(num / 1073741824).toFixed(2)} GB`;
  if (num >= 1048576) return `${(num / 1048576).toFixed(1)} MB`;
  if (num >= 1024) return `${(num / 1024).toFixed(0)} KB`;
  return `${num} B`;
}

function formatQuotaPercent(percent) {
  if (!percent) return '0%';
  return `${percent < 1 ? percent.toFixed(2) : percent.toFixed(1)}%`;
}

function formatDateShort(val) {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '-';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function getUserInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim().slice(0, 1).toUpperCase();
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (value !== '' && value != null && Number.isFinite(number)) {
      return number;
    }
  }
  return null;
}

function normalizeFilebaseQuota(payload) {
  const data = payload?.data ?? payload ?? {};
  const quota = data.filebaseQuota ?? data.filebase ?? data.total ?? data;
  const totalQuota = firstNumber(
    quota.totalQuotaBytes,
    quota.totalQuotaInBytes,
    quota.totalQuota,
    quota.storageLimitBytes,
    quota.storageLimit,
    quota.quotaBytes,
    quota.quota,
  );
  const totalUsage = firstNumber(
    quota.totalUsageBytes,
    quota.totalUsageInBytes,
    quota.totalUsage,
    quota.storageUsedBytes,
    quota.storageUsed,
    quota.usedBytes,
    quota.usage,
    quota.used,
  );
  const reportedPercent = firstNumber(
    quota.usagePercentage,
    quota.usagePercent,
    quota.quotaUsedPercentage,
    quota.quotaPercent,
    quota.percentageUsed,
    quota.percentUsed,
  );
  const calculatedPercent =
    totalQuota && totalUsage != null
      ? (totalUsage / totalQuota) * 100
      : null;
  const usagePercent = calculatedPercent ?? reportedPercent;

  return {
    totalQuota,
    totalUsage,
    usagePercent:
      usagePercent == null
        ? null
        : Math.min(100, Math.max(0, usagePercent)),
  };
}

export function VaultPage() {
  const [stats, setStats] = useState(null);
  const [filebaseQuota, setFilebaseQuota] = useState(null);
  const [vaultUsers, setVaultUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'storage', direction: 'desc' });

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      const [statsResult, usersResult, quotaResult] =
        await Promise.allSettled([
          dashboardService.getEntityVaultStats(),
          dashboardService.getEntityVaultUsers({ limit: 50 }),
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
        const usersData = usersResult.value;
        const users = usersData?.data?.data || usersData?.data || [];
        setVaultUsers(Array.isArray(users) ? users : []);
      } else {
        console.error('Vault users load failed:', usersResult.reason);
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
  const recentUploads = stats?.recentUploads || [];

  const sortedUsers = [...vaultUsers].sort((a, b) => {
    const getVal = (u) => {
      switch (sortConfig.key) {
        case 'user': return u.name || '';
        case 'storage': return Number(u.storageUsed) || 0;
        case 'files': return Number(u.twinPoints) || 0;
        default: return Number(u.storageUsed) || 0;
      }
    };
    const av = getVal(a), bv = getVal(b);
    if (typeof av === 'number' && typeof bv === 'number') return sortConfig.direction === 'asc' ? av - bv : bv - av;
    return sortConfig.direction === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

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
    storageLimit > 0
      ? (storageUsed / storageLimit) * 100
      : filebaseQuota?.usagePercent ??
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

      <section className="table-card vault-detail-card vault-quota-card vault-quota-card-full">
        <div className="vault-card-head">
          <h2>Filebase quota</h2>
        </div>
        <div className="vault-quota-summary">
          <div className="vault-quota-stats">
            <div>
              <strong>{formatQuotaPercent(quotaPercent)}</strong>
              <span>of provisioned quota</span>
            </div>
            <div className="vault-quota-totals">
              <b>{formatBytes(storageUsed)}</b>
              <span>of {formatBytes(storageLimit)}</span>
            </div>
          </div>
          <div
            className="vault-quota-progress-row"
            role="progressbar"
            aria-label="Filebase quota used"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.min(100, quotaPercent)}
          >
            <div className="vault-quota-track">
              <span
                className="vault-quota-fill vault-quota-fill-warning"
                style={{ width: `${Math.min(100, quotaPercent)}%` }}
              />
            </div>
            <span>{formatQuotaPercent(quotaPercent)}</span>
          </div>
          <div className="vault-quota-alert">
            <span className="vault-quota-alert-icon">
              <AlertTriangle size={15} />
            </span>
            <p>
              {quotaPercent >= 75
                ? 'Filebase is approaching its provisioned quota. Consider raising the pin quota.'
                : 'Filebase quota is within a safe range. No quota increase is currently required.'}
            </p>
          </div>
        </div>
      </section>

      <div className="vault-bottom-grid">
        <section className="table-card vault-detail-card vault-users-card">
          <div className="vault-card-head">
            <h2>Vault Users</h2>
          </div>
          <div className="vault-users-table-wrap">
            <table className="vault-users-table">
              <thead>
                <tr>
                  {[['user','User'],['storage','Storage Used'],['limit','Limit'],['points','Twin Points'],['env','Env'],['lastActive','Last active']].map(([key,label]) => (
                    <th key={key}>
                      <button type="button" className="table-sort-button" onClick={() => toggleSort(key)}>
                        <span>{label}</span>
                        <span className={`table-sort-indicator${sortConfig.key === key ? ' active' : ''}`}>
                          {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">No vault users found</td></tr>
                ) : sortedUsers.map((user) => (
                  <tr key={user.id || user.vaultId}>
                    <td>
                      <div className="vault-user-cell">
                        <span className="vault-user-avatar">{getUserInitials(user.name)}</span>
                        <div>
                          <strong>{user.name || user.email || 'Unknown'}</strong>
                          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{user.vaultId || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="cell-primary">{formatBytes(user.storageUsed)}</td>
                    <td>{formatBytes(user.storageLimit)}</td>
                    <td>{formatNumber(user.twinPoints || 0)}</td>
                    <td>{envBadge(user.__env)}</td>
                    <td>{formatDateShort(user.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="table-card vault-detail-card vault-activity-card">
          <div className="vault-card-head">
            <h2>Recent uploads</h2>
          </div>
          <div className="vault-activity-list">
            {recentUploads.length === 0 ? (
              <div className="entity-empty-state">No recent uploads</div>
            ) : recentUploads.map((item, i) => (
              <div key={item.id || i} className="vault-activity-row">
                <span className="vault-activity-icon"><FileUp size={14} /></span>
                <div className="vault-activity-main">
                  <div className="vault-activity-head">
                    <strong>{item.userName || item.name || 'Unknown'}</strong>
                    <span>{item.name || ''}</span>
                  </div>
                  <div className="vault-activity-meta">
                    <span>{formatDateShort(item.createdAt)}</span>
                    <span>{envBadge(item.__env)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
