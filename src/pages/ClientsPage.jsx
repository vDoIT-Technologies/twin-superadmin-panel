import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { useEntityFilters } from "../app/FilterContext";
import { TruncatedText } from "../components/common/TruncatedText";
import { FilterDropdown } from "../components/common/FilterDropdown";
import { dashboardService } from "../services";
import { envBadge } from "../utils/dashboardUtils";
import { normalizeEntityStatus } from "../utils/status";
import { getEntityFilterParams } from "../utils/entityFilters";
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

function formatOptionalCurrency(value) {
  return value == null ? '---' : `$${formatOptionalNumber(value)}`;
}

export function ClientsPage() {
  const { adminProduct } = useAuth();
  const isVault = adminProduct === 'vault';
  const PAGE_SIZE = 10;
  const [filters, setFilters] = useEntityFilters('clients');
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "cost",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [apiClients, setApiClients] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const previousScopeRef = useRef('');

  const updateTableFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  useEffect(() => {
    let isActive = true;
    const scopeKey = JSON.stringify({
      envs: filters.envs,
      range: filters.entityRange,
      status: filters.status,
    });
    const scopeChanged = previousScopeRef.current !== scopeKey;
    previousScopeRef.current = scopeKey;
    const requestedPage = scopeChanged ? 1 : page;

    if (scopeChanged && page !== 1) setPage(1);

    async function loadClients() {
      setIsTableLoading(true);
      setApiClients([]);
      try {
        const data = await dashboardService.getEntityClients({
          page: requestedPage,
          limit: PAGE_SIZE,
          env: filters.envs.length === 1 ? filters.envs[0] : undefined,
          status: filters.status || undefined,
          ...getEntityFilterParams(filters.entityRange),
        });

        if (!isActive) return;

        const payload = getClientsPayload(data);
        setApiClients(payload.clients);
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
  }, [filters.entityRange, filters.envs, filters.status, page]);

  const clientRows = useMemo(() => {
    return apiClients.map((client, index) => {
      const name = client.name || client.organizationName || "";
      const plan = client.plan || "";
      const envs = getEnvList(client);
      const twinsCount = client.twinsCount ?? null;
      const usersCount = client.usersCount ?? null;
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

      return {
        id: getClientId(client),
        rowKey: `${getClientId(client) || 'client-row'}-${client.__env || client.env || 'unknown'}-${index}`,
        name,
        plan,
        envs,
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
  }, [apiClients]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return clientRows.filter((client) => {
      const matchesStatus = !filters.status || client.status === filters.status;
      const matchesQuery = !normalizedQuery || [client.name, client.plan, ...client.envs]
        .some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [clientRows, filters.status, query]);

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

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const scopedTotal = pagination.total;
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

  const exportCsv = () => {
    const header = [
      "Client",
      "Env",
      "Status",
      "Twins",
      "Users",
      "Cost",
      "Revenue",
    ];
    const lines = sortedRows.map((client) =>
      [
        client.name,
        client.envs.join(" | "),
        client.status === 'active' ? 'Active' : client.status === 'inactive' ? 'Inactive' : '---',
        client.twins,
        client.users,
        formatOptionalCurrency(client.cost),
        formatOptionalCurrency(client.revenue),
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clients.csv";
    link.click();
    URL.revokeObjectURL(url);
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
                onChange={(event) => setQuery(event.target.value)}
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
              <FilterDropdown
                value={filters.status}
                onChange={(value) => updateTableFilter('status', value)}
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                placeholder="All Status"
                searchable={false}
                tone={isVault ? 'vault' : 'twin'}
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
                tone={isVault ? 'vault' : 'twin'}
              />
            </div>

            <button
              type="button"
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition ${isVault ? 'hover:border-emerald-300 hover:text-emerald-700' : 'hover:border-indigo-300 hover:text-indigo-600'}`}
              onClick={exportCsv}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[65vh] overflow-auto">
          <table key="clients-seven-column-layout" className="w-full min-w-[960px] border-collapse text-sm [&_td]:!text-left [&_td>div]:justify-start [&_th]:!text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                {[
                  ["client", "Client"],
                  ["env", "Env"],
                  ["status", "Status"],
                  ["twins", "Twins"],
                  ["users", "Users"],
                  ["cost", "Cost"],
                  ["revenue", "Revenue"],
                ].map(([key, label]) => (
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
                  <td colSpan={7} className="p-0 text-sm text-slate-400">
                    <div className="min-h-40" />
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    No clients found
                  </td>
                </tr>
              ) : (
                sortedRows.map((client) => (
                  <tr key={client.rowKey} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50" onClick={() => navigate(`/clients/${client.id}`)}>
                    <td className="px-4 py-3.5 text-left">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${isVault ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'}`}>
                          {getClientInitials(client.name)}
                        </span>
                        <div className="min-w-0">
                          <strong className="block font-semibold text-slate-700"><TruncatedText value={client.name} /></strong>
                          <span className="mt-0.5 block text-xs text-slate-400"><TruncatedText value={client.plan} /></span>
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
                    <td className="px-4 py-3.5 text-slate-500">
                      {client.status ? (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {client.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      ) : '---'}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(client.twins)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(client.users)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatOptionalCurrency(client.cost)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{formatOptionalCurrency(client.revenue)}</td>
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
