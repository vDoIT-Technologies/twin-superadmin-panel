import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { RANGE_DAYS } from '../demo-data/superadminSelectors';
import { envBadge, formatNumber } from '../utils/dashboardUtils.jsx';
import { useAuth } from '../app/AuthContext';
import { isServiceForProduct } from '../utils/productAccess';
import { TruncatedText } from '../components/common/TruncatedText';

const levels = ['all', 'info', 'warn', 'error'];
const PAGE_SIZE = 10;

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
  if (level === 'warn') return <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold tracking-wide text-amber-700">{label}</span>;
  if (level === 'error') return <span className="inline-flex rounded-full bg-rose-50 px-2 py-1 text-[11px] font-bold tracking-wide text-rose-700">{label}</span>;
  return <span className="inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold tracking-wide text-sky-700">{label}</span>;
}

export function TelemetryPage() {
  const { adminProduct } = useAuth();
  const { filters } = useContext(FilterContext);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [service, setService] = useState('all');
  const [env, setEnv] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'ts', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const events = useMemo(() => {
    const days = RANGE_DAYS[filters.range];
    const minTs = new Date(superadminDemoData.TODAY.getTime() - days * 86400000).toISOString();

    return superadminDemoData.EVENTS.filter((event) => {
      const matchesGlobal =
        filters.envs.includes(event.env) &&
        isServiceForProduct(adminProduct, event.service) &&
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
        (adminProduct !== 'vault' && (superadminDemoData.byId.twin(event.twinId)?.name ?? '').toLowerCase().includes(q)) ||
        (superadminDemoData.byId.user(event.userId)?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [adminProduct, env, filters, level, query, service]);

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

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = sortedRows.length ? (safeCurrentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(safeCurrentPage * PAGE_SIZE, sortedRows.length);
  const paginatedRows = useMemo(
    () => sortedRows.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE),
    [safeCurrentPage, sortedRows],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [adminProduct, env, filters.client, filters.envs, filters.range, filters.service, filters.twin, filters.user, level, query, service, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'ts' || key === 'cost' || key === 'units' ? 'desc' : 'asc' },
    );
  };

  const exportCsv = () => {
    const header = ['Timestamp', 'Level', 'Env', 'Service', 'Event', 'Client', ...(adminProduct === 'vault' ? [] : ['Twin']), 'User', 'Units', 'Cost'];
    const lines = sortedRows.map((row) =>
      [
        row.ts,
        row.level.toUpperCase(),
        superadminDemoData.ENV_META[row.env]?.label ?? row.env,
        row.service,
        row.event,
        row.client,
        ...(adminProduct === 'vault' ? [] : [row.twin]),
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
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{adminProduct === 'vault' ? 'Health & Logs' : 'Telemetry / Logs'}</h1>
          <p className="mt-1 text-sm text-slate-500">{adminProduct === 'vault' ? 'Read-only Vault events for storage, files, users, and service health' : 'Read-only event explorer — route hits, chat, video, ingestion, payments'}</p>
        </div>
        <div className="text-left lg:text-right">
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Scope</span>
          <span className="mt-1 block text-sm font-semibold text-slate-600">{scopeLabel}</span>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex h-11 w-full max-w-md items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 lg:w-[22rem]">
            <Search size={16} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={adminProduct === 'vault' ? 'Search events, clients, users...' : 'Search events, twins, users...'}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
              {levels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={service} onChange={(event) => setService(event.target.value)} className="h-10 max-w-[12rem] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
              <option value="all">all services</option>
              {superadminDemoData.SERVICES.filter((svc) => isServiceForProduct(adminProduct, svc.id)).map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>

            <select value={env} onChange={(event) => setEnv(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
              <option value="all">all envs</option>
              {superadminDemoData.ENVS.map((item) => (
                <option key={item} value={item}>
                  {superadminDemoData.ENV_META[item].label}
                </option>
              ))}
            </select>

            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" onClick={exportCsv}>
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  ['ts', 'Timestamp'],
                  ['level', 'Lvl'],
                  ['env', 'Env'],
                  ['service', 'Service'],
                  ['event', 'Event'],
                  ['client', 'Client'],
                  ...(adminProduct === 'vault' ? [] : [['twin', 'Twin']]),
                  ['user', 'User'],
                  ['units', 'Units'],
                  ['cost', 'Cost'],
                ].map(([key, label]) => (
                  <th key={key}>
                    <button type="button" className="inline-flex items-center gap-1.5 py-3 text-left font-semibold transition hover:text-slate-700" onClick={() => toggleSort(key)}>
                      <span>{label}</span>
                      <span className={`text-xs text-slate-300 ${sortConfig.key === key ? 'text-indigo-600' : ''}`}>
                        {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length ? paginatedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">{row.ts}</td>
                  <td className="px-4 py-3.5">{levelBadge(row.level)}</td>
                  <td className="px-4 py-3.5">{envBadge(row.env)}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-700"><TruncatedText value={row.service} /></td>
                  <td className="px-4 py-3.5 text-slate-700"><TruncatedText value={row.event} /></td>
                  <td className="px-4 py-3.5 text-slate-600"><TruncatedText value={row.client} /></td>
                  {adminProduct !== 'vault' ? <td className="px-4 py-3.5 text-slate-600"><TruncatedText value={row.twin} /></td> : null}
                  <td className="px-4 py-3.5 text-slate-600"><TruncatedText value={row.user} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="text-slate-500">
                      <strong className="font-semibold text-slate-800">{formatNumber(row.units)}</strong> <span>{row.unitLabel}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-800">${row.cost.toFixed(4)}</td>
                </tr>
              )) : (
                <tr><td colSpan={adminProduct === 'vault' ? 9 : 10} className="px-5 py-12 text-center text-sm text-slate-400">No log events match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-400">
          <span>{pageStart}-{pageEnd} of {sortedRows.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={safeCurrentPage === 1} aria-label="Previous page" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-14 text-center font-semibold text-slate-500">{safeCurrentPage} / {totalPages}</span>
            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" disabled={safeCurrentPage === totalPages} aria-label="Next page" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
