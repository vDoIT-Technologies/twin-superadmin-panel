import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services';
import { FilterContext } from '../app/FilterContext';
import { formatNumber } from '../utils/dashboardUtils';

function getTwinInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function getPayload(response) {
  if (Array.isArray(response?.data)) return { items: response.data, pagination: response?.pagination ?? null };
  if (Array.isArray(response?.data?.data)) return { items: response.data.data, pagination: response?.data?.pagination ?? response?.pagination ?? null };
  return { items: [], pagination: null };
}

export function TwinsPage() {
  const PAGE_SIZE = 10;
  const { filters } = useContext(FilterContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'tokens', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [apiTwins, setApiTwins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const data = await dashboardService.getEntityTwins({
          page,
          limit: PAGE_SIZE,
          clientId: filters.client,
          twinId: filters.twin,
          env: filters.envs.length === 1 ? filters.envs[0] : undefined,
        });
        if (!active) return;
        const payload = getPayload(data);
        setApiTwins(payload.items);
        setPagination({
          total: Number(payload.pagination?.total) || 0,
          page: Number(payload.pagination?.page) || page,
          limit: Number(payload.pagination?.limit) || PAGE_SIZE,
          totalPages: Number(payload.pagination?.totalPages) || 1,
        });
      } catch (err) {
        console.error('GET /entities/twins failed:', err);
        if (active) setApiTwins([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [filters.client, filters.envs, filters.twin, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.client, filters.envs, filters.twin]);

  const twinRows = useMemo(() => apiTwins.map((t, i) => ({
    id: t._id || t.id || `twin-${i}`,
    name: t.name || '',
    role: t.role || '',
    client: t.clientName || '',
    messages: t.messages || 0,
    videoMins: t.videoMins || 0,
    tokens: t.tokens || 0,
    sources: t.sources || 0,
    cost: t.cost || 0,
  })), [apiTwins]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scopedRows = filters.twin
      ? twinRows.filter((twin) => String(twin.id) === String(filters.twin))
      : twinRows;
    if (!q) return scopedRows;
    return scopedRows.filter((t) =>
      t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q) || t.client.toLowerCase().includes(q),
    );
  }, [filters.twin, query, twinRows]);

  const sortedRows = useMemo(() => {
    const getVal = (t) => {
      switch (sortConfig.key) {
        case 'twin': return t.name;
        case 'client': return t.client;
        case 'messages': return t.messages;
        case 'videoMins': return t.videoMins;
        case 'tokens': return t.tokens;
        case 'sources': return t.sources;
        case 'cost': return t.cost;
        default: return t.name;
      }
    };
    return [...filteredRows].sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (typeof av === 'number' && typeof bv === 'number') return sortConfig.direction === 'asc' ? av - bv : bv - av;
      return sortConfig.direction === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filteredRows, sortConfig]);

  const totalPages = Math.max(1, pagination.totalPages);
  const currentPage = Math.min(page, totalPages);
  const pageStart = sortedRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = sortedRows.length === 0 ? 0 : pageStart + sortedRows.length - 1;

  const toggleSort = (key) => {
    setSortConfig((prev) => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'twin' || key === 'client' ? 'asc' : 'desc' });
  };

  const exportCsv = () => {
    const header = ['Twin', 'Client', 'Messages', 'Video Min', 'Tokens', 'Sources', 'Cost'];
    const lines = sortedRows.map((t) =>
      [t.name, t.client, formatNumber(t.messages), formatNumber(t.videoMins), formatNumber(t.tokens), t.sources, `$${formatNumber(t.cost)}`]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'twins.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-section twins-page">
      <header className="twins-header">
        <div className="twins-header-copy">
          <h1>Twins</h1>
          <p>AI personas — chat volume by modality, media usage and cost</p>
        </div>
      </header>

      <section className="table-card twins-demo-card">
        <div className="twins-toolbar">
          <label className="twins-search">
            <Search size={15} className="twins-search-icon" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search twins..." />
          </label>
          <button type="button" className="twins-export-button" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="twins-demo-table-wrap">
          <table className="twins-demo-table">
            <thead>
              <tr>
                {[['twin','Twin'],['client','Client'],['messages','Messages'],['videoMins','Video min'],['tokens','Tokens'],['sources','Sources'],['cost','Cost']].map(([key,label]) => (
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
              {isLoading ? (
                <tr><td colSpan={7} className="table-empty users-table-loading-cell"><span className="users-table-loader" aria-hidden="true" />Loading twins...</td></tr>
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">No twins found</td></tr>
              ) : sortedRows.map((twin) => (
                <tr key={twin.id} className="entity-row-clickable" onClick={() => navigate(`/twins/${twin.id}`)}>
                  <td>
                    <div className="twins-demo-twin">
                      <span className="twins-demo-avatar">{getTwinInitials(twin.name)}</span>
                      <div><strong>{twin.name}</strong><span>{twin.role}</span></div>
                    </div>
                  </td>
                  <td>{twin.client}</td>
                  <td>{formatNumber(twin.messages)}</td>
                  <td>{formatNumber(twin.videoMins)}</td>
                  <td>{formatNumber(twin.tokens)}</td>
                  <td>{twin.sources}</td>
                  <td className="cell-primary">${formatNumber(twin.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="twins-demo-footer">
          <span>{pageStart}-{pageEnd} of {pagination.total}</span>
          <div className="twins-demo-pagination">
            <button type="button" disabled={currentPage === 1 || isLoading} aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages || isLoading} aria-label="Next page" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></button>
          </div>
        </div>
      </section>
    </section>
  );
}
