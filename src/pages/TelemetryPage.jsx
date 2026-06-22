import { useContext, useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { selectFacts, RANGE_DAYS } from '../demo-data/superadminSelectors';
import { DataTable } from '../components/common/DataTable';
import { formatNumber } from '../utils/dashboardUtils';

const levels = ['all', 'info', 'warn', 'error'];

export function TelemetryPage() {
  const { filters } = useContext(FilterContext);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [service, setService] = useState('all');
  const [env, setEnv] = useState('all');

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
        event.event.includes(q) ||
        superadminDemoData.byId.client(event.clientId).name.toLowerCase().includes(q) ||
        superadminDemoData.byId.twin(event.twinId).name.toLowerCase().includes(q) ||
        superadminDemoData.byId.user(event.userId).name.toLowerCase().includes(q)
      );
    });
  }, [filters, query, level, service, env]);

  const rows = useMemo(
    () =>
      events.slice(0, 120).map((event) => ({
        id: event.ts + event.clientId + event.event,
        ts: event.tsLabel,
        level: event.level,
        env: event.env,
        service: superadminDemoData.byId.service(event.service)?.name ?? event.service,
        event: event.event,
        client: superadminDemoData.byId.client(event.clientId)?.name ?? event.clientId,
        twin: superadminDemoData.byId.twin(event.twinId)?.name ?? event.twinId,
        user: superadminDemoData.byId.user(event.userId)?.name ?? event.userId,
        units: `${formatNumber(event.units)} ${event.unitLabel}`,
        cost: `$${event.cost.toFixed(4)}`,
      })),
    [events],
  );

  const columns = [
    { key: 'ts', label: 'Timestamp' },
    { key: 'level', label: 'Level' },
    { key: 'env', label: 'Env' },
    { key: 'service', label: 'Service' },
    { key: 'event', label: 'Event' },
    { key: 'client', label: 'Client' },
    { key: 'twin', label: 'Twin' },
    { key: 'user', label: 'User' },
    { key: 'units', label: 'Units' },
    { key: 'cost', label: 'Cost' },
  ];

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Telemetry"
        title="Telemetry / Logs"
        description="Read-only event explorer for route hits, chat, video, ingestion, payments, and system telemetry."
      />

      <div className="table-card p-5 mb-5">
        <div className="content-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div>
            <label className="filter-label">Search</label>
            <input
              type="text"
              className="search-shell"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events, twins, users..."
            />
          </div>
          <div>
            <label className="filter-label">Level</label>
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="filter-chip">
              {levels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="filter-label">Service</label>
            <select value={service} onChange={(event) => setService(event.target.value)} className="filter-chip">
              <option value="all">all services</option>
              {superadminDemoData.SERVICES.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="filter-label">Env</label>
            <select value={env} onChange={(event) => setEnv(event.target.value)} className="filter-chip">
              <option value="all">all envs</option>
              {superadminDemoData.ENVS.map((item) => (
                <option key={item} value={item}>
                  {superadminDemoData.ENV_META[item].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DataTable columns={columns} rows={rows} emptyMessage="No events match these filters." />
    </section>
  );
}
