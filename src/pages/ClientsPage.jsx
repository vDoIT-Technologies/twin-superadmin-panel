import { useContext, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { groupBy, selectFacts, sumMetric, timeSeries } from '../demo-data/superadminSelectors';
import { envBadge, formatNumber } from '../utils/dashboardUtils';

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

function getClientInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim().slice(0, 1).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function buildSparklinePath(values, width = 92, height = 28) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function ClientsPage() {
  const { filters } = useContext(FilterContext);
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'cost', direction: 'desc' });

  const scopedFilters = useMemo(
    () => ({
      ...filters,
      service: null,
      vendor: null,
      twin: null,
      user: null,
    }),
    [filters],
  );

  const rows = useMemo(() => selectFacts(scopedFilters), [scopedFilters]);
  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const clientRows = useMemo(() => {
    const costMap = new Map(groupBy(rows, 'clientId', 'cost', scopedFilters).map((entry) => [entry.id, entry.value]));
    const revenueMap = new Map(groupBy(rows, 'clientId', 'revenue', scopedFilters).map((entry) => [entry.id, entry.value]));
    const messageMap = new Map(groupBy(rows, 'clientId', 'messages', scopedFilters).map((entry) => [entry.id, entry.value]));
    const pointMap = new Map(
      groupBy(rows, 'clientId', 'pointsSpent', scopedFilters).map((entry) => [entry.id, entry.value]),
    );

    return superadminDemoData.CLIENTS.filter((client) => !filters.client || client.id === filters.client)
      .map((client) => {
        const cost = costMap.get(client.id) ?? 0;
        const revenue = revenueMap.get(client.id) ?? 0;
        const messages = messageMap.get(client.id) ?? 0;
        const pointsSpent = pointMap.get(client.id) ?? 0;
        const twins = superadminDemoData.TWINS.filter((twin) => twin.clientId === client.id).length;
        const users = superadminDemoData.USERS.filter(
          (user) => user.clientId === client.id && filters.envs.includes(user.env),
        ).length;
        const margin = revenue ? ((revenue - cost) / revenue) * 100 : 0;
        const lastActive = 'today';
        const trendValues = timeSeries(
          rows.filter((row) => row.clientId === client.id),
          'cost',
          scopedFilters,
        ).values;
        const envs = superadminDemoData.ENVS.filter((env) => client.envWeights[env] >= 0.2);

        return {
          id: client.id,
          name: client.name,
          plan: client.plan,
          envs,
          twins,
          users,
          messages,
          pointsSpent,
          revenue,
          cost,
          margin,
          lastActive,
          trendPath: buildSparklinePath(trendValues),
        };
      })
      .sort((left, right) => right.cost - left.cost);
  }, [filters.client, filters.envs, rows, scopedFilters]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientRows;
    return clientRows.filter(
      (client) =>
        client.name.toLowerCase().includes(q) ||
        client.plan.toLowerCase().includes(q) ||
        client.envs.some((env) => superadminDemoData.ENV_META[env].label.toLowerCase().includes(q)),
    );
  }, [clientRows, query]);

  const sortedRows = useMemo(() => {
    const getSortValue = (client) => {
      switch (sortConfig.key) {
        case 'client':
          return client.name;
        case 'env':
          return client.envs.map((env) => superadminDemoData.ENV_META[env].label).join(' ');
        case 'twins':
          return client.twins;
        case 'users':
          return client.users;
        case 'messages':
          return client.messages;
        case 'pointsSpent':
          return client.pointsSpent;
        case 'revenue':
          return client.revenue;
        case 'cost':
          return client.cost;
        case 'margin':
          return client.margin;
        case 'lastActive':
          return client.lastActive;
        default:
          return client.name;
      }
    };

    return [...filteredRows].sort((left, right) => {
      const a = getSortValue(left);
      const b = getSortValue(right);

      if (typeof a === 'number' && typeof b === 'number') {
        return sortConfig.direction === 'asc' ? a - b : b - a;
      }

      return sortConfig.direction === 'asc'
        ? String(a).localeCompare(String(b))
        : String(b).localeCompare(String(a));
    });
  }, [filteredRows, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'client' || key === 'env' || key === 'lastActive' ? 'asc' : 'desc' },
    );
  };

  const exportCsv = () => {
    const header = ['Client', 'Plan', 'Envs', 'Twins', 'Users', 'Messages', 'Points Spent', 'Revenue', 'COGS', 'Margin'];
    const lines = filteredRows.map((client) =>
      [
        client.name,
        client.plan,
        client.envs.map((env) => superadminDemoData.ENV_META[env].label).join(' | '),
        client.twins,
        client.users,
        formatNumber(client.messages),
        formatNumber(client.pointsSpent),
        `$${formatNumber(client.revenue)}`,
        `$${formatNumber(client.cost)}`,
        `${Math.round(client.margin)}%`,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clients.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-section clients-page">
      <header className="clients-header">
        <div className="clients-header-copy">
          <h1>Clients</h1>
          <p>White-label tenants — usage, revenue, COGS and margin</p>
        </div>
        <div className="clients-scope">
          <span className="clients-scope-label">Scope</span>
          <span className="clients-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <section className="table-card clients-demo-card">
        <div className="clients-toolbar">
          <label className="clients-search">
            <Search size={15} className="clients-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clients..."
            />
          </label>

          <button type="button" className="clients-export-button" onClick={exportCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="clients-demo-table-wrap">
          <table className="clients-demo-table">
            <thead>
              <tr>
                {[
                  ['client', 'Client'],
                  ['env', 'Env'],
                  ['twins', 'Twins'],
                  ['users', 'Users'],
                  ['messages', 'Messages'],
                  ['pointsSpent', 'Points spent'],
                  ['revenue', 'Revenue'],
                  ['cost', 'COGS'],
                  ['margin', 'Margin%'],
                  ['lastActive', 'Last active'],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button type="button" className="table-sort-button" onClick={() => toggleSort(key)}>
                      <span>{label}</span>
                      <span className={`table-sort-indicator${sortConfig.key === key ? ' active' : ''}`}>
                        {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div className="clients-demo-client">
                      <span className="clients-demo-avatar">{getClientInitials(client.name)}</span>
                      <div>
                        <strong>{client.name}</strong>
                        <span>{client.plan}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="clients-demo-envs">
                      {client.envs.map((env) => (
                        <span key={env} className="clients-demo-env-badge">
                          {envBadge(env)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{client.twins}</td>
                  <td>{client.users}</td>
                  <td>{formatNumber(client.messages)}</td>
                  <td>{formatNumber(client.pointsSpent)}</td>
                  <td>${formatNumber(client.revenue)}</td>
                  <td>${formatNumber(client.cost)}</td>
                  <td className="clients-demo-margin">{Math.round(client.margin)}%</td>
                  <td>{client.lastActive}</td>
                  <td>
                    <svg className="clients-demo-sparkline" viewBox="0 0 92 28" aria-hidden="true">
                      <path d={client.trendPath} fill="none" stroke="#5b5ce6" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="clients-demo-footer">
          <span>
            1-{sortedRows.length} of {sortedRows.length}
          </span>
          <div className="clients-demo-pagination">
            <button type="button" disabled aria-label="Previous page">
              <ChevronLeft size={14} />
            </button>
            <span>1 / 1</span>
            <button type="button" disabled aria-label="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
