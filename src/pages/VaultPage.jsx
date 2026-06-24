import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Database, Download, FileUp, Package, Percent, TrendingUp, Users } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { groupBy, selectFacts, sumMetric, timeSeries } from '../demo-data/superadminSelectors';
import { areaChart, donut } from '../utils/chartHelpers';
import { envBadge, formatCurrencyFull, formatNumber, formatPercent } from '../utils/dashboardUtils';

const vaultMetricCards = [
  { key: 'storedTb', label: 'Stored on IPFS', icon: Database, tone: 'indigo' },
  { key: 'filesPinned', label: 'Files pinned', icon: FileUp, tone: 'sky' },
  { key: 'backendCost', label: 'Filebase / IPFS · cost', icon: Package, tone: 'violet' },
  { key: 'revenue', label: 'Storage revenue', icon: TrendingUp, tone: 'emerald' },
  { key: 'margin', label: 'Margin', icon: Percent, tone: 'amber' },
  { key: 'activeDrives', label: 'Active drives · users', icon: Users, tone: 'rose' },
];

const backendLegend = [
  { id: 'filebase', label: 'Filebase / IPFS', color: '#1d9bf0' },
  { id: 's3ses', label: 'AWS S3', color: '#fb923c' },
  { id: 'stripe', label: 'Stripe (billing)', color: '#5b5ce6' },
];

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

export function VaultPage() {
  const { filters } = useContext(FilterContext);
  const [sortConfig, setSortConfig] = useState({ key: 'storage', direction: 'desc' });
  const storageChartRef = useRef(null);
  const backendChartRef = useRef(null);

  const vaultFilters = useMemo(
    () => ({
      ...filters,
      service: 'vault',
      vendor: null,
    }),
    [filters],
  );

  const rows = useMemo(() => selectFacts(vaultFilters), [vaultFilters]);
  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const summary = useMemo(() => {
    const totalStorageGb = sumMetric(rows, 'storageGB', vaultFilters);
    const filebaseCost = sumMetric(rows, 'cost', vaultFilters, 'filebase');
    const s3Cost = sumMetric(rows, 'cost', vaultFilters, 's3ses');
    const stripeCost = sumMetric(rows, 'cost', vaultFilters, 'stripe');
    const totalCost = sumMetric(rows, 'cost', vaultFilters);
    const revenue = sumMetric(rows, 'revenue', vaultFilters);
    const margin = revenue ? ((revenue - totalCost) / revenue) * 100 : 0;
    const filesPinned = Math.round(totalStorageGb * 76);
    const activeDrives = superadminDemoData.USERS.filter(
      (user) => (!filters.client || user.clientId === filters.client) && user.lastActiveDaysAgo <= 30,
    ).length;

    return {
      storedTb: `${(totalStorageGb / 1024).toFixed(2)} TB`,
      filesPinned: formatNumber(filesPinned),
      backendCost: formatCurrencyFull(filebaseCost),
      revenue: formatCurrencyFull(revenue),
      margin: formatPercent(margin, 1),
      activeDrives: String(activeDrives),
      filebaseCost,
      s3Cost,
      stripeCost,
      totalCost,
      totalStorageGb,
    };
  }, [filters.client, rows, vaultFilters]);

  const storageSeries = useMemo(() => {
    const series = timeSeries(rows, 'storageGB', vaultFilters);
    let cumulative = 0;
    return {
      labels: series.labels,
      values: series.values.map((value) => {
        cumulative += value;
        return Math.round(cumulative);
      }),
    };
  }, [rows, vaultFilters]);

  const backendCostValues = useMemo(
    () => [summary.filebaseCost, summary.s3Cost, summary.stripeCost],
    [summary.filebaseCost, summary.s3Cost, summary.stripeCost],
  );

  const quotaRows = useMemo(() => {
    const total = Math.max(summary.totalStorageGb, 1);
    return [
      {
        label: 'Filebase / IPFS',
        value: summary.filebaseCost / superadminDemoData.RATE.filebaseGB,
        cap: Math.max(total * 0.62, 1),
        color: '#1d9bf0',
      },
      {
        label: 'AWS S3',
        value: summary.s3Cost / superadminDemoData.RATE.s3GB,
        cap: Math.max(total * 0.32, 1),
        color: '#fb923c',
      },
      {
        label: 'Stripe billing metadata',
        value: summary.totalStorageGb * 0.06,
        cap: Math.max(total * 0.09, 1),
        color: '#5b5ce6',
      },
    ].map((item) => ({
      ...item,
      pct: Math.min(100, (item.value / item.cap) * 100),
    }));
  }, [summary]);

  const storageByClient = useMemo(
    () =>
      groupBy(rows, 'clientId', 'storageGB', vaultFilters)
        .slice(0, 6)
        .map((entry) => {
          const client = superadminDemoData.byId.client(entry.id);
          return {
            id: entry.id,
            name: client?.name ?? entry.id,
            value: entry.value,
            files: Math.round(entry.value * 74),
          };
        }),
    [rows, vaultFilters],
  );

  const quotaSummary = useMemo(() => {
    const filebase = quotaRows[0];
    const pct = Math.round(filebase?.pct ?? 0);
    const daysLeft = pct >= 75 ? 4 : 12;
    return {
      pct,
      usedTb: `${((filebase?.value ?? 0) / 1024).toFixed(2)} TB`,
      capTb: `${((filebase?.cap ?? 0) / 1024).toFixed(2)} TB`,
      daysLeft,
    };
  }, [quotaRows]);

  const topUsers = useMemo(() => {
    const usersByClient = superadminDemoData.USERS.reduce((acc, user) => {
      if (!acc[user.clientId]) acc[user.clientId] = [];
      acc[user.clientId].push(user);
      return acc;
    }, {});

    return storageByClient
      .flatMap((clientEntry) => {
        const users = usersByClient[clientEntry.id] ?? [];
        const totalWeight = Math.max(users.reduce((sum, user) => sum + user.weight, 0), 1);

        return users.map((user) => {
          const share = user.weight / totalWeight;
          const storageGb = clientEntry.value * share;
          const files = Math.round(clientEntry.files * share);

          return {
            id: user.id,
            name: user.name,
            client: superadminDemoData.byId.client(user.clientId)?.name ?? user.clientId,
            env: user.env,
            storageTb: storageGb / 1024,
            files,
            lastActive: `${Math.max(1, user.lastActiveDaysAgo)}d ago`,
          };
        });
      })
      .sort((left, right) => right.storageTb - left.storageTb)
      .slice(0, 6);
  }, [storageByClient]);

  const sortedTopUsers = useMemo(() => {
    const getSortValue = (user) => {
      switch (sortConfig.key) {
        case 'user':
          return user.name;
        case 'client':
          return user.client;
        case 'env':
          return superadminDemoData.ENV_META[user.env]?.label ?? user.env;
        case 'storage':
          return user.storageTb;
        case 'files':
          return user.files;
        case 'lastActive':
          return Number.parseInt(user.lastActive, 10);
        default:
          return user.storageTb;
      }
    };

    return [...topUsers].sort((left, right) => {
      const a = getSortValue(left);
      const b = getSortValue(right);

      if (typeof a === 'number' && typeof b === 'number') {
        return sortConfig.direction === 'asc' ? a - b : b - a;
      }

      return sortConfig.direction === 'asc'
        ? String(a).localeCompare(String(b))
        : String(b).localeCompare(String(a));
    });
  }, [sortConfig, topUsers]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'user' || key === 'client' || key === 'env' ? 'asc' : 'desc' },
    );
  };

  const recentPinActivity = useMemo(
    () =>
      superadminDemoData.EVENTS.filter((event) => event.service === 'vault')
        .filter((event) => filters.envs.includes(event.env))
        .slice(0, 5)
        .map((event) => ({
          id: `${event.ts}-${event.clientId}`,
          client: superadminDemoData.byId.client(event.clientId)?.name ?? event.clientId,
          ts: event.tsLabel,
          env: event.env,
          size: `${formatNumber(event.units)} GB`,
        })),
    [filters.envs],
  );

  const exportVaultCsv = () => {
    const header = ['User', 'Client', 'Env', 'Storage TB', 'Files', 'Last Active'];
    const lines = topUsers.map((user) =>
      [user.name, user.client, user.env, user.storageTb.toFixed(2), user.files, user.lastActive]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vault-top-users.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const charts = [];

    if (storageChartRef.current) {
      charts.push(
        areaChart(
          storageChartRef.current,
          storageSeries.labels,
          [{ label: 'GB pinned', color: '#1198f4', data: storageSeries.values }],
          { fmt: (value) => `${formatNumber(value)} GB`, yfmt: (value) => `${formatNumber(value)}` },
        ),
      );
    }

    if (backendChartRef.current) {
      charts.push(
        donut(
          backendChartRef.current,
          backendLegend.map((item) => item.label),
          backendCostValues,
          backendLegend.map((item) => item.color),
          { fmt: (value) => formatCurrencyFull(value), cutout: '68%' },
        ),
      );
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [backendCostValues, storageSeries]);

  return (
    <section className="page-section vault-page">
      <header className="vault-header">
        <div className="vault-header-copy">
          <h1>Vault</h1>
          <p>Decentralised user file storage — Filebase / IPFS pinning across encrypted drives</p>
        </div>
        <div className="vault-scope">
          <span className="vault-scope-label">Scope</span>
          <span className="vault-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <div className="vault-metric-grid">
        {vaultMetricCards.map((metric) => {
          const Icon = metric.icon;
          const isCostCard = metric.key === 'backendCost';

          return (
            <article key={metric.key} className="table-card vault-metric-card">
              <div className="vault-metric-top">
                <span className={`vault-metric-icon vault-metric-icon-${metric.tone}`}>
                  <Icon size={18} />
                </span>
                {isCostCard ? <span className="vault-metric-delta">^ 16.3%</span> : null}
              </div>
              <h2>{summary[metric.key]}</h2>
              <p>{metric.label}</p>
            </article>
          );
        })}
      </div>

      <div className="vault-chart-grid">
        <section className="table-card vault-chart-card vault-storage-card">
          <div className="vault-card-head">
            <h2>Storage under management</h2>
            <span>GB pinned, per day</span>
          </div>
          <div className="chart-wrapper vault-storage-wrapper">
            <canvas ref={storageChartRef} />
          </div>
        </section>

        <section className="table-card vault-chart-card vault-backend-card">
          <div className="vault-card-head">
            <h2>Cost by backend</h2>
          </div>
          <div className="vault-backend-layout">
            <div className="chart-wrapper vault-donut-wrapper">
              <canvas ref={backendChartRef} />
            </div>
            <div className="vault-backend-legend">
              {backendLegend.map((item, index) => {
                const value = backendCostValues[index];
                const pct = summary.totalCost ? Math.round((value / summary.totalCost) * 100) : 0;
                return (
                  <div key={item.id} className="vault-backend-row">
                    <span className="vault-backend-label">
                      <i className="vault-backend-dot" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <div className="vault-backend-values">
                      <strong>{formatCurrencyFull(value)}</strong>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="vault-lower-grid">
        <section className="table-card vault-detail-card vault-quota-card">
          <div className="vault-card-head">
            <h2>Filebase quota</h2>
          </div>
          <div className="vault-quota-summary">
            <div className="vault-quota-stats">
              <div>
                <strong>{quotaSummary.pct}%</strong>
                <span>of provisioned quota</span>
              </div>
              <div className="vault-quota-totals">
                <b>{quotaSummary.usedTb}</b>
                <span>of {quotaSummary.capTb}</span>
              </div>
            </div>
            <div className="vault-quota-progress-row">
              <div className="vault-quota-track">
                <span className="vault-quota-fill vault-quota-fill-warning" style={{ width: `${quotaSummary.pct}%` }} />
              </div>
              <span>{quotaSummary.pct}%</span>
            </div>
            <div className="vault-quota-alert">
              <span className="vault-quota-alert-icon">
                <AlertTriangle size={15} />
              </span>
              <p>At current growth, Filebase reaches 100% in ~{quotaSummary.daysLeft} days. Consider raising the pin quota.</p>
            </div>
          </div>
        </section>

        <section className="table-card vault-detail-card vault-client-card">
          <div className="vault-card-head">
            <h2>Storage by client</h2>
            <span>click to drill</span>
          </div>
          <div className="vault-client-list">
            {storageByClient.map((client, index) => (
              <div key={client.id} className="vault-client-row">
                <span className="vault-client-rank">{index + 1}</span>
                <span className="vault-client-avatar">{client.name.slice(0, 2).toUpperCase()}</span>
                <div className="vault-client-main">
                  <div className="vault-client-head">
                    <strong>{client.name}</strong>
                    <b>{(client.value / 1024).toFixed(2)} TB</b>
                  </div>
                  <div className="vault-client-bar">
                    <span
                      className="vault-client-bar-fill"
                      style={{ width: `${(client.value / Math.max(storageByClient[0]?.value || 1, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="vault-client-meta">
                    <span>{client.files.toLocaleString('en-US')} files</span>
                    <span className="vault-client-arrow">›</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="vault-bottom-grid">
        <section className="table-card vault-detail-card vault-users-card">
          <div className="vault-card-head">
            <h2>Top users by storage</h2>
            <button type="button" className="vault-export-button" onClick={exportVaultCsv}>
              <Download size={14} />
              Export CSV
            </button>
          </div>
          <div className="vault-users-table-wrap">
            <table className="vault-users-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="table-sort-button" onClick={() => toggleSort('user')}>
                      <span>User</span>
                      <span className={`table-sort-indicator${sortConfig.key === 'user' ? ' active' : ''}`}>
                        {sortConfig.key === 'user' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="table-sort-button" onClick={() => toggleSort('client')}>
                      <span>Client</span>
                      <span className={`table-sort-indicator${sortConfig.key === 'client' ? ' active' : ''}`}>
                        {sortConfig.key === 'client' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="table-sort-button" onClick={() => toggleSort('env')}>
                      <span>Env</span>
                      <span className={`table-sort-indicator${sortConfig.key === 'env' ? ' active' : ''}`}>
                        {sortConfig.key === 'env' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="table-sort-button" onClick={() => toggleSort('storage')}>
                      <span>Storage</span>
                      <span className={`table-sort-indicator${sortConfig.key === 'storage' ? ' active' : ''}`}>
                        {sortConfig.key === 'storage' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="table-sort-button" onClick={() => toggleSort('files')}>
                      <span>Files</span>
                      <span className={`table-sort-indicator${sortConfig.key === 'files' ? ' active' : ''}`}>
                        {sortConfig.key === 'files' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="table-sort-button" onClick={() => toggleSort('lastActive')}>
                      <span>Last active</span>
                      <span className={`table-sort-indicator${sortConfig.key === 'lastActive' ? ' active' : ''}`}>
                        {sortConfig.key === 'lastActive' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTopUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="vault-user-cell">
                        <span className="vault-user-avatar">{user.name.slice(0, 2).toUpperCase()}</span>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td>{user.client}</td>
                    <td>{envBadge(user.env)}</td>
                    <td className="cell-primary">{user.storageTb.toFixed(2)} TB</td>
                    <td>{formatNumber(user.files)}</td>
                    <td>{user.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="table-card vault-detail-card vault-activity-card">
          <div className="vault-card-head">
            <h2>Recent pin activity</h2>
          </div>
          <div className="vault-activity-list">
            {recentPinActivity.map((item) => (
              <div key={item.id} className="vault-activity-row">
                <span className="vault-activity-icon">
                  <FileUp size={14} />
                </span>
                <div className="vault-activity-main">
                  <div className="vault-activity-head">
                    <strong>{item.client}</strong>
                    <span>{item.size}</span>
                  </div>
                  <div className="vault-activity-meta">
                    <span>{item.ts}</span>
                    <span>{envBadge(item.env)}</span>
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
