import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardService, exportService, getClientsDropdown } from '../services';
import { useEntityFilters } from '../app/FilterContext';
import { TruncatedText } from '../components/common/TruncatedText';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { envBadge, formatCost, formatNumber } from '../utils/dashboardUtils';
import { normalizeEntityStatus } from '../utils/status';
import { getEntityFilterParams } from '../utils/entityFilters';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { isNumericTableSearch, matchesTableSearch, TABLE_SEARCH_DATASET_LIMIT } from '../utils/tableSearch';

function getTwinInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function getPayload(response) {
  if (Array.isArray(response)) return { items: response, pagination: null };
  if (Array.isArray(response?.twins)) return { items: response.twins, pagination: response?.pagination ?? null };
  if (Array.isArray(response?.items)) return { items: response.items, pagination: response?.pagination ?? null };
  if (Array.isArray(response?.data)) return { items: response.data, pagination: response?.pagination ?? null };
  if (Array.isArray(response?.data?.twins)) return { items: response.data.twins, pagination: response?.data?.pagination ?? response?.pagination ?? null };
  if (Array.isArray(response?.data?.items)) return { items: response.data.items, pagination: response?.data?.pagination ?? response?.pagination ?? null };
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

function parseOptionalNumber(value) {
  if (value == null || value === '') return null;
  const rawValue = typeof value === 'object' && '$numberDecimal' in value ? value.$numberDecimal : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatOptionalNumber(value) {
  return value == null ? '---' : formatNumber(value);
}

export function TwinsPage() {
  const PAGE_SIZE = 10;
  const [filters, setFilters] = useEntityFilters('twins');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const [sortConfig, setSortConfig] = useState({ key: 'pointsSpent', direction: 'desc' });
  const [page, setPage] = useState(() => {
    const requestedPage = Number(searchParams.get('page'));
    return Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  });
  const previousFilterScopeRef = useRef(null);
  const [apiTwins, setApiTwins] = useState([]);
  const [clientFilterOptions, setClientFilterOptions] = useState([]);
  const [clientNamesById, setClientNamesById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });

  useEffect(() => {
    let active = true;
    const env = filters.envs.length === 1 ? filters.envs[0] : undefined;
    getClientsDropdown({ env }).then((clients) => {
      if (!active) return;
      const options = clients.map((client) => ({
        value: getId(client.id ?? client._id ?? client.clientId),
        label: client.name ?? client.clientName ?? client.label ?? 'Unnamed client',
      })).filter((option) => option.value);
      setClientFilterOptions(options);
      setClientNamesById(Object.fromEntries(options.map((option) => [option.value, option.label])));
    }).catch((error) => console.error('Twin table filters failed to load:', error));
    return () => { active = false; };
  }, [filters.client, filters.envs]);

  const updateTableFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'client' ? { twin: null } : {}),
    }));
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const requestParams = {
          page,
          limit: PAGE_SIZE,
          clientId: filters.client,
          env: filters.envs.length === 1 ? filters.envs[0] : undefined,
          status: filters.status || undefined,
          ...getEntityFilterParams(filters.entityRange),
        };
        const usesLocalNumericSearch = isNumericTableSearch(debouncedQuery);
        const data = debouncedQuery && !usesLocalNumericSearch
          ? await dashboardService.searchEntityTwins({ ...requestParams, search: debouncedQuery })
          : await dashboardService.getEntityTwins(usesLocalNumericSearch
            ? { ...requestParams, page: 1, limit: TABLE_SEARCH_DATASET_LIMIT }
            : requestParams);
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
  }, [debouncedQuery, filters.client, filters.entityRange, filters.envs, filters.status, page]);

  useEffect(() => {
    const scopeKey = JSON.stringify({
      client: filters.client,
      entityRange: filters.entityRange,
      envs: filters.envs,
      status: filters.status,
    });
    const scopeChanged = previousFilterScopeRef.current !== null
      && previousFilterScopeRef.current !== scopeKey;
    previousFilterScopeRef.current = scopeKey;
    if (scopeChanged) setPage(1);
  }, [filters.client, filters.entityRange, filters.envs, filters.status]);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (page > 1) next.set('page', String(page));
      else next.delete('page');
      return next;
    }, { replace: true });
  }, [page, setSearchParams]);

  const twinRows = useMemo(() => apiTwins.map((t, i) => {
    const clientId = getId(t.clientId ?? t.client?._id ?? t.client?.id);
    const clientName = t.clientName ?? t.client?.name ?? '';
    const environment = t.__env ?? t.env ?? t.environment ?? '';
    const rawStatus = t.status ?? t.twinStatus ?? t.state;
    const explicitActive = t.isActive ?? t.active ?? t.enabled;
    const status = normalizeEntityStatus(rawStatus, explicitActive);
    const associatedUsers = t.associatedUsers ?? t.users ?? t.userIds ?? t.associatedUserIds ?? t.linkedUsers;
    const apiUsersCount = parseOptionalNumber(t.usersCount ?? t.userCount ?? t.associatedUsersCount ?? t.linkedUsersCount)
      ?? (Array.isArray(associatedUsers) ? associatedUsers.length : null);
    const usersCount = apiUsersCount;

    const id = getId(t._id ?? t.id) || `twin-${i}`;
    const env = typeof environment === 'string' ? environment.toLowerCase() : environment?.id ?? environment?.name ?? '';
    const detailRoute = env ? `/twins/${id}?env=${encodeURIComponent(env)}` : `/twins/${id}`;


    return {
      id,
      rowKey: `${id}-${env || 'unknown'}-${i}`,
      detailRoute,
      clientId,
      name: t.name || '',
      role: t.role || '',
      env,
      client: clientName || clientNamesById[clientId] || '---',
      clientName,
      usersCount,
      cost: parseOptionalNumber(t.cost ?? t.totalCost ?? t.usageCost ?? t.cogs ?? t.usage?.totalCost ?? t.usage?.cost ?? t.kpis?.totalCost ?? t.kpis?.cost),
      revenue: parseOptionalNumber(t.totalRevenue ?? t.revenueAmount ?? t.revenue ?? t.usage?.totalRevenue ?? t.usage?.revenue ?? t.kpis?.totalRevenue ?? t.kpis?.revenue),
      totalPoints: parseOptionalNumber(t.totalPoints ?? t.points ?? t.pointsBalance ?? t.pointBalance ?? t.balance ?? t.kpis?.totalPoints ?? t.kpis?.pointsBalance),
      pointsSpent: parseOptionalNumber(t.pointsSpent ?? t.spentPoints ?? t.totalPointsSpent ?? t.pointsUsed ?? t.points_spent ?? t.kpis?.pointsSpent ?? t.kpis?.totalPointsSpent),
      status,
    };
  }), [apiTwins, clientNamesById]);
 

  const filteredRows = useMemo(() => {
    const selectedClientId = getId(filters.client);
    const selectedClientName = selectedClientId
      ? clientNamesById[selectedClientId]?.trim().toLowerCase()
      : '';
    return twinRows.filter((twin) => {
      const matchesClient = !selectedClientId
        || twin.clientId === selectedClientId
        || (selectedClientName && twin.clientName.trim().toLowerCase() === selectedClientName);
      const matchesStatus = !filters.status || twin.status === filters.status;
      const matchesQuery = matchesTableSearch(query, [
        twin.name,
        twin.role,
        twin.env,
        twin.client,
        twin.usersCount,
        formatOptionalNumber(twin.usersCount),
        twin.status,
        twin.cost,
        formatCost(twin.cost),
        twin.revenue,
        formatCost(twin.revenue),
        twin.totalPoints,
        formatOptionalNumber(twin.totalPoints),
        twin.pointsSpent,
        formatOptionalNumber(twin.pointsSpent),
      ]);
      return matchesClient && matchesStatus && matchesQuery;
    });
  }, [clientNamesById, filters.client, filters.status, query, twinRows]);

  const sortedRows = useMemo(() => {
    const getVal = (t) => {
      switch (sortConfig.key) {
        case 'twin': return t.name;
        case 'env': return t.env;
        case 'client': return t.client;
        case 'users': return t.usersCount;
        case 'cost': return t.cost;
        case 'revenue': return t.revenue;
        case 'totalPoints': return t.totalPoints;
        case 'pointsSpent': return t.pointsSpent;
        case 'status': return t.status;
        default: return t.name;
      }
    };
    return [...filteredRows].sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (typeof av === 'number' && typeof bv === 'number') return sortConfig.direction === 'asc' ? av - bv : bv - av;
      return sortConfig.direction === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filteredRows, sortConfig]);

  const usesLocalNumericSearch = isNumericTableSearch(debouncedQuery);
  const totalPages = usesLocalNumericSearch ? 1 : Math.max(1, pagination.totalPages);
  const currentPage = Math.min(page, totalPages);
  const pageStart = sortedRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = sortedRows.length === 0 ? 0 : pageStart + sortedRows.length - 1;
  const displayedTotal = usesLocalNumericSearch ? sortedRows.length : pagination.total;

  const toggleSort = (key) => {
    setSortConfig((prev) => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'twin' || key === 'env' || key === 'client' ? 'asc' : 'desc' });
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      await exportService.twins({
        clientId: filters.client || undefined,
        env: filters.envs.length === 1 ? filters.envs[0] : undefined,
        status: filters.status || undefined,
        search: debouncedQuery || undefined,
        ...getEntityFilterParams(filters.entityRange),
      });
    } catch (error) {
      console.error('GET /api/v1/export/twins failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="flex h-10 w-full shrink-0 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 xl:w-64">
            <Search size={15} />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search twins..."
            />
          </label>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <FilterDropdown
              value={filters.envs.length === 1 ? filters.envs[0] : null}
              onChange={(value) => updateTableFilter('envs', value ? [value] : ['dev', 'staging', 'prod'])}
              options={[{ value: 'dev', label: 'Development' }, { value: 'staging', label: 'Staging' }, { value: 'prod', label: 'Production' }]}
              placeholder="All environments"
              searchable={false}
              tone="twin"
            />
            <FilterDropdown
              value={filters.status}
              onChange={(value) => updateTableFilter('status', value)}
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
              placeholder="All Status"
              searchable={false}
              tone="twin"
            />
            <FilterDropdown
              value={filters.entityRange === 'all' ? null : filters.entityRange}
              onChange={(value) => updateTableFilter('entityRange', value || 'all')}
              options={[
                { value: '7days', label: 'Last 7 Days' },
                { value: '1month', label: 'Last 1 Month' },
                { value: '6months', label: 'Last 6 Months' },
                { value: '1year', label: 'Last 1 Year' },
                { value: 'morethan1year', label: 'More Than 1 Year' },
              ]}
              placeholder="All Dates"
              searchable={false}
              align="right"
              tone="twin"
            />
            <FilterDropdown
              value={filters.client}
              onChange={(value) => updateTableFilter('client', value)}
              options={clientFilterOptions}
              placeholder="All clients"
              searchPlaceholder="Search client..."
              align="right"
              tone="twin"
            />
          </div>

          <button type="button" disabled={isExporting} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60" onClick={exportCsv}>
            <Download size={14} /> {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[65vh] overflow-auto">
          <table key="twins-nine-column-layout" className="w-full min-w-[1120px] border-collapse text-sm [&_td]:!text-left [&_td>div]:justify-start [&_th]:!text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                {[['twin','Twin'],['env','Env'],['client','Client'],['users','Users'],['status','Status'],['revenue','Revenue'],['pointsSpent','Points Spent']].map(([key,label]) => (
                  <th key={key} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 ${key === 'twin' || key === 'client' || key === 'status' ? 'text-left' : key === 'env' ? 'text-center' : 'text-right'}`}>
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
                <tr>
                  <td colSpan={7} className="p-0 text-sm text-slate-400">
                    <div className="min-h-40" />
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No twins found</td></tr>
              ) : sortedRows.map((twin) => (
                <tr
                  key={twin.rowKey}
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                  onClick={() => navigate(twin.detailRoute, {
                    state: { from: `${location.pathname}${location.search}` },
                  })}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">{getTwinInitials(twin.name)}</span>
                      <div className="min-w-0"><strong className="block font-semibold text-slate-700"><TruncatedText value={twin.name} /></strong><span className="mt-0.5 block text-xs text-slate-400"><TruncatedText value={twin.role} /></span></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500">{superadminDemoData.ENV_META[twin.env] ? envBadge(twin.env) : <TruncatedText value={twin.env || '---'} />}</td>
                  <td className="px-4 py-3.5 text-slate-500"><TruncatedText value={twin.client || '---'} /></td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(twin.usersCount)}</td>
                  <td className="px-4 py-3.5 text-slate-500">
                    {twin.status ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${twin.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{twin.status === 'active' ? 'Active' : 'Inactive'}</span> : '---'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-500">{formatCost(twin.revenue)}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(twin.pointsSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {isLoading ? (
            <div className="pointer-events-none absolute inset-x-0 top-14 flex h-40 items-center justify-center gap-2 text-sm text-slate-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" aria-hidden="true" />
              <span>Loading twins...</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-400">
          <span>{pageStart}-{pageEnd} of {displayedTotal}</span>
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
