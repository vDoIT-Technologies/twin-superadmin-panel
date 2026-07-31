import { useEffect, useState } from 'react';
import { AlertTriangle, Database, Download, FileUp, Package, Percent, TrendingUp, Users } from 'lucide-react';
import { dashboardService, getFilebaseQuota, getFilebaseTopUsers } from '../services';
import { envBadge, formatNumber } from '../utils/dashboardUtils';

const BYTES_PER_GB = 1024 ** 3;
const BYTES_PER_TB = 1024 ** 4;

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

function formatLastActive(val) {
  if (typeof val === 'string' && (/^\d+d ago$/i.test(val.trim()) || val.trim().toLowerCase() === 'today')) {
    return val.trim();
  }
  return formatDateShort(val);
}

function formatActivityTimestamp(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const part = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}`;
}

function getActivityStorage(item) {
  const bytes = firstNumber(
    item.storageBytes,
    item.sizeBytes,
    item.fileSizeBytes,
    item.bytes,
  );
  if (bytes != null) return formatBytes(bytes);

  const gigabytes = firstNumber(item.storageGB, item.sizeGB, item.fileSizeGB);
  if (gigabytes != null) return `${formatNumber(gigabytes)} GB`;

  return item.storage ?? item.size ?? item.fileSize ?? '-';
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
  const quotaBytes = firstNumber(
    quota.totalQuotaBytes,
    quota.totalQuotaInBytes,
    quota.totalQuota,
    quota.storageLimitBytes,
    quota.storageLimit,
    quota.quotaBytes,
    quota.quota,
  );
  const quotaTb = firstNumber(
    quota.totalQuotaTB,
    quota.totalQuotaTb,
    quota.quotaTB,
    quota.quotaTb,
  );
  const quotaGb = firstNumber(
    quota.totalQuotaGB,
    quota.totalQuotaGb,
    quota.quotaGB,
    quota.quotaGb,
  );
  const totalQuota =
    quotaTb != null
      ? quotaTb * BYTES_PER_TB
      : quotaGb != null
        ? quotaGb * BYTES_PER_GB
        : quotaBytes;
  const usageBytes = firstNumber(
    quota.totalUsageBytes,
    quota.totalUsageInBytes,
    quota.totalUsage,
    quota.storageUsedBytes,
    quota.storageUsed,
    quota.usedBytes,
    quota.usage,
    quota.used,
  );
  const usageTb = firstNumber(
    quota.totalUsageTB,
    quota.totalUsageTb,
    quota.usageTB,
    quota.usageTb,
    quota.usedTB,
    quota.usedTb,
  );
  const usageGb = firstNumber(
    quota.totalUsageGB,
    quota.totalUsageGb,
    quota.usageGB,
    quota.usageGb,
    quota.usedGB,
    quota.usedGb,
  );
  const totalUsage =
    usageTb != null
      ? usageTb * BYTES_PER_TB
      : usageGb != null
        ? usageGb * BYTES_PER_GB
        : usageBytes;
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

function getTopUserStorageBytes(user) {
  const storageTb = firstNumber(user.storageTB, user.storageTb);
  if (storageTb != null && storageTb > 0) return storageTb * BYTES_PER_TB;

  const storageGb = firstNumber(user.storageGB, user.storageGb);
  if (storageGb != null) return storageGb * BYTES_PER_GB;

  if (storageTb === 0) return 0;

  const rawStorage =
    user.storageBytes ??
    user.storageUsedBytes ??
    user.storageUsed ??
    user.storage ??
    0;

  if (typeof rawStorage === 'string') {
    const match = rawStorage.trim().match(/^([\d.]+)\s*(TB|GB|MB|KB|B)?$/i);
    if (match) {
      const value = Number(match[1]);
      const unit = match[2]?.toUpperCase() ?? 'B';
      const multipliers = {
        TB: BYTES_PER_TB,
        GB: BYTES_PER_GB,
        MB: 1024 ** 2,
        KB: 1024,
        B: 1,
      };
      return value * multipliers[unit];
    }
  }

  return firstNumber(rawStorage) ?? 0;
}

function normalizeTopUser(user) {
  const client = user.client;
  const rawEnv = String(user.env ?? user.environment ?? user.__env ?? 'dev').toLowerCase();
  const env = rawEnv === 'development' ? 'dev' : rawEnv === 'production' ? 'prod' : rawEnv;
  const clientName =
    user.clientName ??
    (typeof client === 'string' ? client : client?.name) ??
    user.clientId ??
    '-';
  return {
    id: user.id ?? user._id ?? user.userId,
    name: user.name?.trim() || user.userName?.trim() || user.email || 'Unknown user',
    email: user.email ?? '',
    client: typeof clientName === 'string' ? clientName.trim() : clientName,
    env,
    storageBytes: getTopUserStorageBytes(user),
    files: firstNumber(user.files, user.fileCount, user.filesCount, user.totalFiles, user.twinPoints) ?? 0,
    lastActive:
      user.lastActive ??
      user.lastActiveAt ??
      user.lastActiveDate ??
      user.updatedAt,
  };
}

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
  const recentUploads = stats?.recentUploads || [];

  const sortedUsers = [...topUsers].sort((a, b) => {
    const getVal = (u) => {
      switch (sortConfig.key) {
        case 'user': return u.name || '';
        case 'client': return u.client || '';
        case 'env': return u.env || '';
        case 'storage': return u.storageBytes;
        case 'files': return u.files;
        case 'lastActive': return new Date(u.lastActive).getTime() || 0;
        default: return u.storageBytes;
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

  const exportTopUsersCsv = () => {
    const header = ['User', 'Email', 'Client', 'Env', 'Storage', 'Files', 'Last Active'];
    const rows = sortedUsers.map((user) => [
      user.name,
      user.email,
      user.client,
      user.env,
      formatBytes(user.storageBytes),
      user.files,
      user.lastActive ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'top-users-by-storage.csv';
    link.click();
    URL.revokeObjectURL(url);
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
        <section className="table-card vault-detail-card vault-users-card vault-top-users-card">
          <div className="vault-card-head">
            <h2>Top users by storage</h2>
            <button type="button" className="vault-export-button" onClick={exportTopUsersCsv}>
              <Download size={14} />
              Export CSV
            </button>
          </div>
          <div className="vault-users-table-wrap">
            <table className="vault-users-table">
              <thead>
                <tr>
                  {[['user','User'],['client','Client'],['env','Env'],['storage','Storage'],['files','Files'],['lastActive','Last active']].map(([key,label]) => (
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
                  <tr><td colSpan={6} className="table-empty">No storage users found</td></tr>
                ) : sortedUsers.map((user) => (
                  <tr key={user.id || `${user.email}-${user.client}`}>
                    <td>
                      <div className="vault-user-cell">
                        <span className="vault-user-avatar">{getUserInitials(user.name)}</span>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td>{user.client}</td>
                    <td>{envBadge(user.env)}</td>
                    <td className="cell-primary">{formatBytes(user.storageBytes)}</td>
                    <td>{formatNumber(user.files)}</td>
                    <td>{formatLastActive(user.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="table-card vault-detail-card vault-activity-card vault-recent-uploads-card">
          <div className="vault-card-head">
            <h2>Recent pin activity</h2>
          </div>
          <div className="vault-activity-list">
            {recentUploads.length === 0 ? (
              <div className="entity-empty-state">No recent uploads</div>
            ) : recentUploads.map((item, i) => (
              <div key={item.id || i} className="vault-activity-row">
                <span className="vault-activity-icon"><FileUp size={14} /></span>
                <div className="vault-activity-main">
                  <div className="vault-activity-head">
                    <strong>{item.clientName || item.userName || item.name || 'Unknown'}</strong>
                    <div className="vault-activity-values">
                      {envBadge(item.env ?? item.environment ?? item.__env)}
                      <span>{getActivityStorage(item)}</span>
                    </div>
                  </div>
                  <div className="vault-activity-meta">{formatActivityTimestamp(item.createdAt ?? item.updatedAt ?? item.lastActive)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
