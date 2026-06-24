import { useContext, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { groupBy, selectFacts, sumMetric, twinShare } from '../demo-data/superadminSelectors';
import { formatNumber } from '../utils/dashboardUtils';

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

function getTwinInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function TwinsPage() {
  const { filters } = useContext(FilterContext);
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'cost', direction: 'desc' });

  const scopedFilters = useMemo(
    () => ({
      ...filters,
      service: null,
      vendor: null,
      user: null,
    }),
    [filters],
  );

  const rows = useMemo(() => selectFacts(scopedFilters), [scopedFilters]);
  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const clientCostMap = useMemo(
    () => new Map(groupBy(rows, 'clientId', 'cost', scopedFilters).map((entry) => [entry.id, entry.value])),
    [rows, scopedFilters],
  );
  const clientRevenueMap = useMemo(
    () => new Map(groupBy(rows, 'clientId', 'revenue', scopedFilters).map((entry) => [entry.id, entry.value])),
    [rows, scopedFilters],
  );
  const clientMessageMap = useMemo(
    () => new Map(groupBy(rows, 'clientId', 'messages', scopedFilters).map((entry) => [entry.id, entry.value])),
    [rows, scopedFilters],
  );
  const clientTokensMap = useMemo(
    () => new Map(groupBy(rows, 'clientId', 'tokens', scopedFilters).map((entry) => [entry.id, entry.value])),
    [rows, scopedFilters],
  );
  const clientVoiceMap = useMemo(
    () => new Map(groupBy(rows, 'clientId', 'voiceChars', scopedFilters).map((entry) => [entry.id, entry.value])),
    [rows, scopedFilters],
  );
  const clientVideoMap = useMemo(
    () => new Map(groupBy(rows, 'clientId', 'videoMins', scopedFilters).map((entry) => [entry.id, entry.value])),
    [rows, scopedFilters],
  );

  const twinRows = useMemo(() => {
    return superadminDemoData.TWINS.filter((twin) => !filters.client || twin.clientId === filters.client)
      .filter((twin) => !filters.twin || twin.id === filters.twin)
      .map((twin) => {
        const share = twinShare(twin);
        const client = superadminDemoData.byId.client(twin.clientId);
        const messages = (clientMessageMap.get(twin.clientId) ?? 0) * share;
        const tokens = (clientTokensMap.get(twin.clientId) ?? 0) * share;
        const voiceChars = (clientVoiceMap.get(twin.clientId) ?? 0) * share;
        const videoMins = (clientVideoMap.get(twin.clientId) ?? 0) * share;
        const cost = (clientCostMap.get(twin.clientId) ?? 0) * share;
        const revenue = (clientRevenueMap.get(twin.clientId) ?? 0) * share;
        const textMessages = messages * twin.modalityMix.text;
        const audioMessages = messages * twin.modalityMix.audio;
        const videoMessages = messages * twin.modalityMix.video;
        const sources = Math.round(96 + twin.weight * 48 + twin.createdDaysAgo * 0.12);

        return {
          id: twin.id,
          name: twin.name,
          role: twin.role,
          client: client?.name ?? twin.clientId,
          messages,
          textMessages,
          audioMessages,
          videoMessages,
          videoMins,
          voiceChars,
          tokens,
          sources,
          cost,
          revenue,
        };
      })
      .sort((left, right) => right.cost - left.cost);
  }, [
    clientCostMap,
    clientMessageMap,
    clientRevenueMap,
    clientTokensMap,
    clientVideoMap,
    clientVoiceMap,
    filters.client,
    filters.twin,
  ]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return twinRows;
    return twinRows.filter(
      (twin) =>
        twin.name.toLowerCase().includes(q) ||
        twin.role.toLowerCase().includes(q) ||
        twin.client.toLowerCase().includes(q),
    );
  }, [query, twinRows]);

  const sortedRows = useMemo(() => {
    const getSortValue = (twin) => {
      switch (sortConfig.key) {
        case 'twin':
          return twin.name;
        case 'client':
          return twin.client;
        case 'messages':
          return twin.messages;
        case 'videoMins':
          return twin.videoMins;
        case 'voiceChars':
          return twin.voiceChars;
        case 'tokens':
          return twin.tokens;
        case 'sources':
          return twin.sources;
        case 'cost':
          return twin.cost;
        case 'revenue':
          return twin.revenue;
        default:
          return twin.name;
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
        : { key, direction: key === 'twin' || key === 'client' ? 'asc' : 'desc' },
    );
  };

  const exportCsv = () => {
    const header = ['Twin', 'Client', 'Messages', 'Text', 'Audio', 'Video', 'Video Min', 'Voice Chars', 'Tokens', 'Sources', 'Cost', 'Revenue'];
    const lines = filteredRows.map((twin) =>
      [
        twin.name,
        twin.client,
        formatNumber(twin.messages),
        formatNumber(twin.textMessages),
        formatNumber(twin.audioMessages),
        formatNumber(twin.videoMessages),
        formatNumber(twin.videoMins),
        formatNumber(twin.voiceChars),
        formatNumber(twin.tokens),
        twin.sources,
        `$${formatNumber(twin.cost)}`,
        `$${formatNumber(twin.revenue)}`,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'twins.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-section twins-page">
      <header className="twins-header">
        <div className="twins-header-copy">
          <h1>Twins</h1>
          <p>AI personas — chat volume by modality, media usage and cost</p>
        </div>
        <div className="twins-scope">
          <span className="twins-scope-label">Scope</span>
          <span className="twins-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <section className="table-card twins-demo-card">
        <div className="twins-toolbar">
          <label className="twins-search">
            <Search size={15} className="twins-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search twins..."
            />
          </label>

          <button type="button" className="twins-export-button" onClick={exportCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="twins-demo-table-wrap">
          <table className="twins-demo-table">
            <thead>
              <tr>
                {[
                  ['twin', 'Twin'],
                  ['client', 'Client'],
                  ['messages', 'Messages (T/A/V)'],
                  ['videoMins', 'Video min'],
                  ['voiceChars', 'Voice chars'],
                  ['tokens', 'Tokens'],
                  ['sources', 'Sources'],
                  ['cost', 'Cost'],
                  ['revenue', 'Revenue'],
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
              {sortedRows.map((twin) => (
                <tr key={twin.id}>
                  <td>
                    <div className="twins-demo-twin">
                      <span className="twins-demo-avatar">{getTwinInitials(twin.name)}</span>
                      <div>
                        <strong>{twin.name}</strong>
                        <span>{twin.role}</span>
                      </div>
                    </div>
                  </td>
                  <td>{twin.client}</td>
                  <td className="twins-demo-cell-messages">
                    <div className="twins-demo-messages">
                      <strong>{formatNumber(twin.messages)}</strong>
                      <span>
                        {formatNumber(twin.textMessages)}/{formatNumber(twin.audioMessages)}/{formatNumber(twin.videoMessages)}
                      </span>
                    </div>
                  </td>
                  <td>{formatNumber(twin.videoMins)}</td>
                  <td>{formatNumber(twin.voiceChars)}</td>
                  <td>{formatNumber(twin.tokens)}</td>
                  <td>{twin.sources}</td>
                  <td className="cell-primary">${formatNumber(twin.cost)}</td>
                  <td>${formatNumber(twin.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="twins-demo-footer">
          <span>
            1-{sortedRows.length} of {sortedRows.length}
          </span>
          <div className="twins-demo-pagination">
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
