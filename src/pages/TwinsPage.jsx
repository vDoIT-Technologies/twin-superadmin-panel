import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services';
import { FilterContext } from '../app/FilterContext';
import { TruncatedText } from '../components/common/TruncatedText';
import { envBadge, formatNumber } from '../utils/dashboardUtils';
import { superadminDemoData } from '../demo-data/superadminDemoData';

function getTwinInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function getPayload(response) {
  if (Array.isArray(response?.data)) return { items: response.data, pagination: response?.pagination ?? null };
  if (Array.isArray(response?.data?.data)) return { items: response.data.data, pagination: response?.data?.pagination ?? response?.pagination ?? null };
  if (Array.isArray(response?.data?.data?.data)) {
    return {
      items: response.data.data.data,
      pagination: response.data.data.pagination ?? response?.pagination ?? null,
    };
  }
  return { items: [], pagination: null };
}

function getId(value) {
  const id = value?._id ?? value?.id ?? value;
  return id == null ? '' : String(id);
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

  const twinRows = useMemo(() => apiTwins.map((t, i) => {
    const clientId = getId(t.clientId ?? t.client?._id ?? t.client?.id);
    const clientName = t.clientName ?? t.client?.name ?? '';
    const environment = t.__env ?? t.env ?? t.environment ?? '';

    return {
      id: getId(t._id ?? t.id) || `twin-${i}`,
      clientId,
      name: t.name || '',
      role: t.role || '',
      env: typeof environment === 'string' ? environment.toLowerCase() : environment?.id ?? environment?.name ?? '',
      client: clientName || '---', //clientId ||
      clientName,
      messages: t.messages || 0,
      videoMins: t.videoMins || 0,
      tokens: t.tokens || 0,
      sources: t.sources || 0,
      cost: t.cost || 0,
    };
  }), [apiTwins]);
 

  const sortedRows = useMemo(() => {
    const getVal = (t) => {
      switch (sortConfig.key) {
        case 'twin': return t.name;
        case 'env': return t.env;
        case 'client': return t.client;
        case 'messages': return t.messages;
        case 'videoMins': return t.videoMins;
        case 'tokens': return t.tokens;
        case 'sources': return t.sources;
        case 'cost': return t.cost;
        default: return t.name;
      }
    };
    return [...twinRows].sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (typeof av === 'number' && typeof bv === 'number') return sortConfig.direction === 'asc' ? av - bv : bv - av;
      return sortConfig.direction === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [twinRows, sortConfig]);

  const totalPages = Math.max(1, pagination.totalPages);
  const currentPage = Math.min(page, totalPages);
  const pageStart = sortedRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = sortedRows.length === 0 ? 0 : pageStart + sortedRows.length - 1;

  const toggleSort = (key) => {
    setSortConfig((prev) => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'twin' || key === 'env' || key === 'client' ? 'asc' : 'desc' });
  };

  const exportCsv = () => {
    const header = ['Twin', 'Env', 'Client', 'Messages', 'Video Min', 'Tokens', 'Sources', 'Cost'];
    const lines = sortedRows.map((t) =>
      [t.name, t.env, t.client, formatNumber(t.messages), formatNumber(t.videoMins), formatNumber(t.tokens), t.sources, `$${formatNumber(t.cost)}`]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'twins.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Twins</h1>
          <p className="mt-1 text-sm text-slate-400">AI personas — chat volume by modality, media usage and cost</p>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <label className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 sm:w-80">
            <Search size={15} />
            <input className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search twins..." />
          </label>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                {[['twin','Twin'],['env','Env'],['client','Client'],['messages','Messages'],['videoMins','Video min'],['tokens','Tokens'],['sources','Sources'],['cost','Cost']].map(([key,label]) => (
                  <th key={key} className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                    <button type="button" className="inline-flex items-center gap-1 transition hover:text-slate-700" onClick={() => toggleSort(key)}>
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
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400"><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600 align-[-2px]" aria-hidden="true" />Loading twins...</td></tr>
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">No twins found</td></tr>
              ) : sortedRows.map((twin) => (
                <tr key={twin.id} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50" onClick={() => navigate(`/twins/${twin.id}`)}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">{getTwinInitials(twin.name)}</span>
                      <div className="min-w-0"><strong className="block font-semibold text-slate-700"><TruncatedText value={twin.name} /></strong><span className="mt-0.5 block text-xs text-slate-400"><TruncatedText value={twin.role} /></span></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{superadminDemoData.ENV_META[twin.env] ? envBadge(twin.env) : <TruncatedText value={twin.env || '---'} />}</td>
                  <td className="px-4 py-3.5 text-slate-500"><TruncatedText value={twin.client || '---'} /></td>
                  <td className="px-4 py-3.5 text-slate-500">{formatNumber(twin.messages)}</td>
                  <td className="px-4 py-3.5 text-slate-500">{formatNumber(twin.videoMins)}</td>
                  <td className="px-4 py-3.5 text-slate-500">{formatNumber(twin.tokens)}</td>
                  <td className="px-4 py-3.5 text-slate-500"><TruncatedText value={twin.sources} /></td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">${formatNumber(twin.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-400">
          <span>{pageStart}-{pageEnd} of {pagination.total}</span>
          <div className="flex items-center gap-2 font-medium text-slate-600">
            <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-40" disabled={currentPage === 1 || isLoading} aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-40" disabled={currentPage === totalPages || isLoading} aria-label="Next page" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></button>
          </div>
        </div>
      </section>
    </section>
  );
}
