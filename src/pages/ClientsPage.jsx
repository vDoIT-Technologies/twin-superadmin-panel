import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { useEntityFilters } from "../app/FilterContext";
import { TruncatedText } from "../components/common/TruncatedText";
import { FilterDropdown } from "../components/common/FilterDropdown";
import { dashboardService, exportService } from "../services";
import { envBadge, formatCost } from "../utils/dashboardUtils";
import { normalizeEntityStatus } from "../utils/status";
import { getEntityFilterParams } from "../utils/entityFilters";
import { isNumericTableSearch, matchesTableSearch, TABLE_SEARCH_DATASET_LIMIT } from "../utils/tableSearch";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import {
  formatOptionalNumber,
  getClientInitials,
  getClientsPayload,
  getEnvList,
  parseDecimal,
} from "../utils/clientUtils";

function getClientId(client) {
  const id = client?.id ?? client?._id ?? client?.clientId ?? client?.client?.id ?? client?.client?._id;
  return id == null ? '' : String(id);
}

function getClientCacheKeys(client) {
  const env = getEnvList(client)[0] || '';
  const id = getClientId(client);
  const name = String(client?.name ?? client?.organizationName ?? '').trim().toLowerCase();

  return [
    id ? `id:${id}:${env}` : '',
    name ? `name:${name}:${env}` : '',
  ].filter(Boolean);
}

export function ClientsPage() {
  const { adminProduct } = useAuth();
  const isVault = adminProduct === 'vault';
  const PAGE_SIZE = 10;
  const [filters, setFilters] = useEntityFilters('clients');
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [sortConfig, setSortConfig] = useState({
    key: "cost",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [apiClients, setApiClients] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const previousScopeRef = useRef('');
  const vaultClientCacheRef = useRef(new Map());
  const clientTableColumns = useMemo(() => [
    ["client", "Client"],
    ["env", "Env"],
    ...(!isVault ? [["status", "Status"]] : []),
    ...(!isVault ? [["twins", "Twins"]] : []),
    ["users", "Users"],
    ["cost", "Cost"],
    ["revenue", "Revenue"],
  ], [isVault]);

  const updateTableFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (!isVault || !filters.status) return;
    setFilters((current) => ({ ...current, status: null }));
  }, [filters.status, isVault, setFilters]);

  useEffect(() => {
    let isActive = true;
    const scopeKey = JSON.stringify({
      envs: filters.envs,
      range: filters.entityRange,
      status: isVault ? null : filters.status,
    });
    const scopeChanged = previousScopeRef.current !== scopeKey;
    previousScopeRef.current = scopeKey;
    const requestedPage = scopeChanged ? 1 : page;

    if (scopeChanged && page !== 1) setPage(1);

    async function loadClients() {
      setIsTableLoading(true);
      setApiClients([]);
      try {
        const requestParams = {
          page: requestedPage,
          limit: PAGE_SIZE,
          env: filters.envs.length === 1 ? filters.envs[0] : undefined,
          status: isVault ? undefined : filters.status || undefined,
          ...getEntityFilterParams(filters.entityRange),
        };
        const usesLocalNumericSearch = isNumericTableSearch(debouncedQuery);
        const data = debouncedQuery && !usesLocalNumericSearch
          ? await dashboardService.searchEntityClients({ ...requestParams, search: debouncedQuery })
          : await dashboardService.getEntityClients(usesLocalNumericSearch
            ? { ...requestParams, page: 1, limit: TABLE_SEARCH_DATASET_LIMIT }
            : requestParams);

        if (!isActive) return;

        let payload = getClientsPayload(data);

        if (isVault && debouncedQuery && !usesLocalNumericSearch) {
          payload = {
            ...payload,
            clients: payload.clients.map((searchClient) => {
              const cachedClient = getClientCacheKeys(searchClient)
                .map((key) => vaultClientCacheRef.current.get(key))
                .find(Boolean);

              return cachedClient ?? searchClient;
            }),
          };
        }

        const scopedClients = payload.clients.filter((client) => {
          const source = String(client?.source ?? client?.type ?? '').toLowerCase();
          if (!source) return true;
          return isVault ? source === 'vault' : source !== 'vault';
        });
        if (isVault && !debouncedQuery) {
          scopedClients.forEach((client) => {
            getClientCacheKeys(client).forEach((key) => {
              vaultClientCacheRef.current.set(key, client);
            });
          });
        }
        setApiClients(scopedClients);
        setPagination({
          total: Number(payload.pagination?.total) || 0,
          page: Number(payload.pagination?.page) || requestedPage,
          limit: Number(payload.pagination?.limit) || PAGE_SIZE,
          totalPages: Number(payload.pagination?.totalPages) || 1,
        });
      } catch (error) {
        if (!isActive) return;
        console.error("GET /api/v1/entities/clients failed:", error);
        setApiClients([]);
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
      } finally {
        if (isActive) setIsTableLoading(false);
      }
    }

    loadClients();
    return () => {
      isActive = false;
    };
  }, [debouncedQuery, filters.entityRange, filters.envs, filters.status, isVault, page]);

  const clientRows = useMemo(() => {
    return apiClients.map((client, index) => {
      if (!isVault) {
        const id = String(client._id);
        const envs = client.__env ? [client.__env] : [];
        const primaryEnv = envs[0] ?? '';

        return {
          id,
          rowKey: `${id}-${primaryEnv || 'unknown'}-${index}`,
          detailRoute: primaryEnv ? `/clients/${id}?env=${encodeURIComponent(primaryEnv)}` : `/clients/${id}`,
          name: client.name,
          plan: '',
          envs,
          primaryEnv,
          twins: client.twinsCount,
          users: client.usersCount,
          messages: client.messages,
          pointsSpent: client.pointsSpent,
          revenue: client.revenue,
          cost: client.cost,
          margin: client.margin,
          lastActive: client.updatedAt,
          status: client.status,
        };
      }

      const name = client.name || client.organizationName || "";
      const plan = client.plan || "";
      const envs = getEnvList(client);
      const twinsCount = client.twinsCount ?? null;
      const usersCount = client.userCount ?? client.usersCount ?? null;
      const messages = client.messages ?? null;
      const pointsSpent = parseDecimal(client.pointsSpent);
      const revenue = parseDecimal(client.revenue);
      const cost = parseDecimal(
        client.totalCost ?? client.usageCost ?? client.cogs
        ?? client.usage?.totalCost ?? client.usage?.cost
        ?? client.kpis?.totalCost ?? client.kpis?.cost
        ?? client.metrics?.totalCost ?? client.metrics?.cost
        ?? client.cost,
      );
      const margin = parseDecimal(client.margin);
      const lastActive = client.lastActive;
      const rawStatus = client.status ?? client.clientStatus ?? client.state;
      const explicitActive = client.isActive ?? client.active ?? client.enabled;
      const status = normalizeEntityStatus(rawStatus, explicitActive);
      const id = getClientId(client);
      const primaryEnv = envs[0] ?? '';
      const detailRoute = primaryEnv ? `/clients/${id}?env=${encodeURIComponent(primaryEnv)}` : `/clients/${id}`;

      return {
        id,
        rowKey: `${id || 'client-row'}-${client.__env || client.env || 'unknown'}-${index}`,
        detailRoute,
        name,
        plan,
        envs,
        primaryEnv,
        twins: twinsCount,
        users: usersCount,
        messages,
        pointsSpent,
        revenue,
        cost,
        margin,
        lastActive,
        status,
      };
    });
  }, [apiClients, isVault]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return clientRows.filter((client) => {
      const matchesStatus = isVault || !filters.status || client.status === filters.status;
      const matchesQuery = matchesTableSearch(normalizedQuery, [
        client.name,
        client.plan,
        ...client.envs,
        client.status,
        client.twins,
        formatOptionalNumber(client.twins),
        client.users,
        formatOptionalNumber(client.users),
        client.cost,
        formatCost(client.cost),
        client.revenue,
        formatCost(client.revenue),
      ]);
      return matchesStatus && matchesQuery;
    });
  }, [clientRows, filters.status, isVault, query]);

  const sortedRows = useMemo(() => {
    const getSortValue = (client) => {
      switch (sortConfig.key) {
        case "client":
          return client.name;
        case "env":
          return client.envs.join(" ");
        case "status":
          return client.status;
        case "twins":
          return client.twins;
        case "users":
          return client.users;
        case "messages":
          return client.messages;
        case "pointsSpent":
          return client.pointsSpent;
        case "revenue":
          return client.revenue;
        case "cost":
          return client.cost;
        case "margin":
          return client.margin;
        default:
          return client.name;
      }
    };

    return [...filteredRows].sort((left, right) => {
      const a = getSortValue(left);
      const b = getSortValue(right);

      if (typeof a === "number" && typeof b === "number") {
        return sortConfig.direction === "asc" ? a - b : b - a;
      }

      return sortConfig.direction === "asc"
        ? String(a).localeCompare(String(b))
        : String(b).localeCompare(String(a));
    });
  }, [filteredRows, sortConfig]);

  const usesLocalNumericSearch = isNumericTableSearch(debouncedQuery);
  const totalPages = usesLocalNumericSearch ? 1 : Math.max(1, pagination.totalPages || 1);
  const scopedTotal = usesLocalNumericSearch ? sortedRows.length : pagination.total;
  const scopedTotalPages = totalPages;
  const currentPage = Math.min(page, scopedTotalPages);
  const pageStart =
    sortedRows.length === 0
      ? 0
      : (currentPage - 1) * (pagination.limit || PAGE_SIZE) + 1;
  const pageEnd =
    sortedRows.length === 0 ? 0 : pageStart + sortedRows.length - 1;

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction:
              key === "client" || key === "env"
                ? "asc"
                : "desc",
          },
    );
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      await exportService.clients({
        env: filters.envs.length === 1 ? filters.envs[0] : undefined,
        status: isVault ? undefined : filters.status || undefined,
        search: debouncedQuery || undefined,
        ...getEntityFilterParams(filters.entityRange),
      });
    } catch (error) {
      console.error('GET /api/v1/export/clients failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
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
                placeholder="Search clients..."
              />
            </label>

            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <FilterDropdown
              value={filters.envs.length === 1 ? filters.envs[0] : null}
              onChange={(value) => updateTableFilter('envs', value ? [value] : ['dev', 'staging', 'prod'])}
              options={[{ value: 'dev', label: 'Development' }, { value: 'staging', label: 'Staging' }, { value: 'prod', label: 'Production' }]}
              placeholder="All environments"
              searchPlaceholder="Search environment..."
              searchable={false}
              tone={isVault ? 'vault' : 'twin'}
            />
              {!isVault ? (
                <FilterDropdown
                  value={filters.status}
                  onChange={(value) => updateTableFilter('status', value)}
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                  placeholder="All Status"
                  searchable={false}
                  tone="twin"
                />
              ) : null}
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
                tone={isVault ? 'vault' : 'twin'}
              />
            </div>

            <button
              type="button"
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition ${isVault ? 'hover:border-emerald-300 hover:text-emerald-700' : 'hover:border-indigo-300 hover:text-indigo-600'}`}
              onClick={exportCsv}
              disabled={isExporting}
            >
              <Download size={14} />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[65vh] overflow-auto">
          <table key={isVault ? "clients-vault-layout" : "clients-twin-layout"} className="w-full min-w-[960px] border-collapse text-sm [&_td]:!text-left [&_td>div]:justify-start [&_th]:!text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                {clientTableColumns.map(([key, label]) => (
                  <th key={key} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 ${key === 'client' ? 'text-left' : key === 'env' ? 'text-center' : 'text-right'}`}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 transition hover:text-slate-700"
                      onClick={() => toggleSort(key)}
                    >
                      <span>{label}</span>
                      <span
                        className={`text-xs text-slate-300 ${sortConfig.key === key ? "text-indigo-600" : ""}`}
                      >
                        {sortConfig.key === key
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isTableLoading ? (
                <tr>
                  <td colSpan={clientTableColumns.length} className="p-0 text-sm text-slate-400">
                    <div className="min-h-40" />
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={clientTableColumns.length} className="px-5 py-12 text-center text-sm text-slate-400">
                    No clients found
                  </td>
                </tr>
              ) : (
                sortedRows.map((client) => (
                  <tr
                    key={client.rowKey}
                    className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                    onClick={() => navigate(client.detailRoute)}
                  >
                    <td className="px-4 py-3.5 text-left">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${isVault ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>
                          {getClientInitials(client.name)}
                        </span>
                        <div className="min-w-0">
                          <strong className="block font-semibold text-slate-700"><TruncatedText value={client.name} /></strong>
                          {isVault && client.plan ? (
                            <span className="mt-0.5 block text-xs text-slate-400"><TruncatedText value={client.plan} /></span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {client.envs.map((env) => (
                          <span key={env} className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                            {envBadge(env)}
                          </span>
                        ))}
                      </div>
                    </td>
                    {!isVault ? (
                      <td className="px-4 py-3.5 text-slate-500">
                        {client.status ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {client.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        ) : '---'}
                      </td>
                    ) : null}
                    {!isVault ? <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(client.twins)}</td> : null}
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(client.users)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatCost(client.cost)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatCost(client.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          {isTableLoading ? (
            <div className="pointer-events-none absolute inset-x-0 top-14 flex h-40 items-center justify-center gap-2 text-sm text-slate-400">
              <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${isVault ? 'border-emerald-100 border-t-emerald-600' : 'border-indigo-100 border-t-indigo-600'}`} aria-hidden="true" />
              <span>Loading clients...</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-400">
          <span>
            {pageStart}-{pageEnd} of {scopedTotal}
          </span>
          <div className="flex items-center gap-2 font-medium text-slate-600">
            <button
              type="button"
              disabled={currentPage === 1 || isTableLoading}
              aria-label="Previous page"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {currentPage} / {scopedTotalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === scopedTotalPages || isTableLoading}
              aria-label="Next page"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"
              onClick={() => setPage((prev) => Math.min(scopedTotalPages, prev + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
