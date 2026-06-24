import { useContext, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { RANGE_DAYS } from '../demo-data/superadminSelectors';
import { envBadge, formatNumber } from '../utils/dashboardUtils.jsx';

const levels = ['all', 'info', 'warn', 'error'];

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

function levelBadge(level) {
  const label = level.toUpperCase();
  if (level === 'warn') return <span className="telemetry-level telemetry-level-warn">{label}</span>;
  if (level === 'error') return <span className="telemetry-level telemetry-level-error">{label}</span>;
  return <span className="telemetry-level telemetry-level-info">{label}</span>;
}

export function TelemetryPage() {
  const { filters } = useContext(FilterContext);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [service, setService] = useState('all');
  const [env, setEnv] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'ts', direction: 'desc' });

  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const events = useMemo(() => {
    const days = RANGE_DAYS[filters.range];
    const minTs = new Date(superadminDemoData.TODAY.getTime() - days * 86400000).toISOString();

    return superadminDemoData.EVENTS.filter((event) => {
      const matchesGlobal =
        filters.envs.includes(event.env) &&
        (!filters.client || event.clientId === filters.client) &&
        (!filters.service || event.service === filters.service) &&
        (!filters.twin || event.twinId === filters.twin) &&
        (!filters.user || event.userId === filters.user);

      const matchesLocal =
        (level === 'all' || event.level === level) &&
        (service === 'all' || event.service === service) &&
        (env === 'all' || event.env === env) &&
        event.ts >= minTs;

      if (!matchesGlobal || !matchesLocal) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        event.event.toLowerCase().includes(q) ||
        (superadminDemoData.byId.client(event.clientId)?.name ?? '').toLowerCase().includes(q) ||
        (superadminDemoData.byId.twin(event.twinId)?.name ?? '').toLowerCase().includes(q) ||
        (superadminDemoData.byId.user(event.userId)?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [env, filters, level, query, service]);

  const rows = useMemo(
    () =>
      events.map((event) => ({
        id: `${event.ts}-${event.clientId}-${event.event}`,
        ts: event.tsLabel,
        tsRaw: event.ts,
        level: event.level,
        env: event.env,
        service: superadminDemoData.byId.service(event.service)?.name ?? event.service,
        event: event.event,
        client: superadminDemoData.byId.client(event.clientId)?.name ?? event.clientId,
        twin: superadminDemoData.byId.twin(event.twinId)?.name ?? event.twinId,
        user: superadminDemoData.byId.user(event.userId)?.name ?? event.userId,
        units: event.units,
        unitLabel: event.unitLabel,
        cost: event.cost,
      })),
    [events],
  );

  const sortedRows = useMemo(() => {
    const getSortValue = (row) => {
      switch (sortConfig.key) {
        case 'ts':
          return row.tsRaw;
        case 'level':
          return row.level;
        case 'env':
          return superadminDemoData.ENV_META[row.env]?.label ?? row.env;
        case 'service':
          return row.service;
        case 'event':
          return row.event;
        case 'client':
          return row.client;
        case 'twin':
          return row.twin;
        case 'user':
          return row.user;
        case 'units':
          return row.units;
        case 'cost':
          return row.cost;
        default:
          return row.tsRaw;
      }
    };

    return [...rows].sort((left, right) => {
      const a = getSortValue(left);
      const b = getSortValue(right);

      if (typeof a === 'number' && typeof b === 'number') {
        return sortConfig.direction === 'asc' ? a - b : b - a;
      }

      return sortConfig.direction === 'asc'
        ? String(a).localeCompare(String(b))
        : String(b).localeCompare(String(a));
    });
  }, [rows, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'ts' || key === 'cost' || key === 'units' ? 'desc' : 'asc' },
    );
  };

  const exportCsv = () => {
    const header = ['Timestamp', 'Level', 'Env', 'Service', 'Event', 'Client', 'Twin', 'User', 'Units', 'Cost'];
    const lines = sortedRows.map((row) =>
      [
        row.ts,
        row.level.toUpperCase(),
        superadminDemoData.ENV_META[row.env]?.label ?? row.env,
        row.service,
        row.event,
        row.client,
        row.twin,
        row.user,
        `${formatNumber(row.units)} ${row.unitLabel}`,
        `$${row.cost.toFixed(4)}`,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'telemetry-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-section telemetry-demo-page">
      <header className="telemetry-demo-header">
        <div className="telemetry-demo-header-copy">
          <h1>Telemetry / Logs</h1>
          <p>Read-only event explorer — route hits, chat, video, ingestion, payments</p>
        </div>
        <div className="telemetry-demo-scope">
          <span className="telemetry-demo-scope-label">Scope</span>
          <span className="telemetry-demo-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <section className="table-card telemetry-demo-card">
        <div className="telemetry-demo-toolbar">
          <label className="telemetry-demo-search">
            <Search size={15} className="telemetry-demo-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events, twins, users..."
            />
          </label>

          <div className="telemetry-demo-toolbar-actions">
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="telemetry-demo-select">
              {levels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={service} onChange={(event) => setService(event.target.value)} className="telemetry-demo-select">
              <option value="all">all services</option>
              {superadminDemoData.SERVICES.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>

            <select value={env} onChange={(event) => setEnv(event.target.value)} className="telemetry-demo-select">
              <option value="all">all envs</option>
              {superadminDemoData.ENVS.map((item) => (
                <option key={item} value={item}>
                  {superadminDemoData.ENV_META[item].label}
                </option>
              ))}
            </select>

            <button type="button" className="telemetry-demo-export" onClick={exportCsv}>
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="telemetry-demo-table-wrap">
          <table className="telemetry-demo-table">
            <thead>
              <tr>
                {[
                  ['ts', 'Timestamp'],
                  ['level', 'Lvl'],
                  ['env', 'Env'],
                  ['service', 'Service'],
                  ['event', 'Event'],
                  ['client', 'Client'],
                  ['twin', 'Twin'],
                  ['user', 'User'],
                  ['units', 'Units'],
                  ['cost', 'Cost'],
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
              </tr>
            </thead>
            <tbody>
              {sortedRows.slice(0, 120).map((row) => (
                <tr key={row.id}>
                  <td className="telemetry-demo-ts">{row.ts}</td>
                  <td>{levelBadge(row.level)}</td>
                  <td>{envBadge(row.env)}</td>
                  <td className="telemetry-demo-service">{row.service}</td>
                  <td className="telemetry-demo-event">{row.event}</td>
                  <td>{row.client}</td>
                  <td>{row.twin}</td>
                  <td>{row.user}</td>
                  <td>
                    <span className="telemetry-demo-units">
                      <strong>{formatNumber(row.units)}</strong> <span>{row.unitLabel}</span>
                    </span>
                  </td>
                  <td className="cell-primary">${row.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
