import { useContext, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FilterContext } from "../app/FilterContext";
import { useAuth } from "../app/AuthContext";
import { TruncatedText } from "../components/common/TruncatedText";
import { dashboardService } from "../services";
import { envBadge } from "../utils/dashboardUtils";
import {
  formatLastActive,
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

export function ClientsPage() {
  const { adminProduct } = useAuth();
  const isVault = adminProduct === 'vault';
  const PAGE_SIZE = 10;
  const { filters } = useContext(FilterContext);
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

  useEffect(() => {
    let isActive = true;

    async function loadClients() {
      setIsTableLoading(true);
      try {
        const data = await dashboardService.getEntityClients({
          page,
          limit: PAGE_SIZE,
          clientId: filters.client,
          twinId: filters.twin,
          env: filters.envs.length === 1 ? filters.envs[0] : undefined,
          range: filters.range,
        });

        if (!isActive) return;

        const payload = getClientsPayload(data);
        setApiClients(payload.clients);
        setPagination({
          total: Number(payload.pagination?.total) || 0,
          page: Number(payload.pagination?.page) || page,
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
  }, [filters.client, filters.envs, filters.range, filters.twin, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.client, filters.envs, filters.range, filters.twin]);

  const clientRows = useMemo(() => {
    return apiClients.map((client, index) => {
      const name = client.name || client.organizationName || "";
      const plan = client.plan || "";
      const envs = getEnvList(client);
      const twinsCount = client.twinsCount ?? 0;
      const usersCount = client.usersCount ?? 0;
      const messages = client.messages ?? 0;
      const pointsSpent = parseDecimal(client.pointsSpent);
      const revenue = parseDecimal(client.revenue);
      const cost = parseDecimal(client.cost ?? client.usage?.cost);
      const margin = parseDecimal(client.margin);
      const lastActive = client.lastActive;

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
      };
    });
  }, [apiClients]);

  const sortedRows = useMemo(() => {
    const getSortValue = (client) => {
      switch (sortConfig.key) {
        case "client":
          return client.name;
        case "env":
          return client.envs.join(" ");
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
        case "lastActive":
          return client.lastActive || "";
        default:
          return client.name;
      }
    };

    return [...clientRows].sort((left, right) => {
      const a = getSortValue(left);
      const b = getSortValue(right);

      if (typeof a === "number" && typeof b === "number") {
        return sortConfig.direction === "asc" ? a - b : b - a;
      }

      return sortConfig.direction === "asc"
        ? String(a).localeCompare(String(b))
        : String(b).localeCompare(String(a));
    });
  }, [clientRows, sortConfig]);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const usingClientScope = Boolean(filters.client);
  const scopedTotal = usingClientScope ? sortedRows.length : pagination.total;
  const scopedTotalPages = usingClientScope ? 1 : totalPages;
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
              key === "client" || key === "env" || key === "lastActive"
                ? "asc"
                : "desc",
          },
    );
  };

  const exportCsv = () => {
    const header = [
      "Client",
      "Plan",
      "Envs",
      ...(!isVault ? ["Twins"] : []),
      "Users",
      "Messages",
      "Points Spent",
      "Revenue",
      "COGS",
      "Margin",
    ];
    const lines = sortedRows.map((client) =>
      [
        client.name,
        client.plan,
        client.envs.join(" | "),
        ...(!isVault ? [client.twins] : []),
        client.users,
        formatOptionalNumber(client.messages),
        formatOptionalNumber(client.pointsSpent),
        `$${formatOptionalNumber(client.revenue)}`,
        `$${formatOptionalNumber(client.cost)}`,
        `${Math.round(client.margin)}%`,
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-400">White-label tenants — usage, revenue, COGS and margin</p>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <label className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 sm:w-80">
            <Search size={15} />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Search clients..."
            />
          </label>

          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
            onClick={exportCsv}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="max-h-[65vh] overflow-auto">
          <table className={`w-full border-collapse text-sm ${isVault ? 'min-w-[980px]' : 'min-w-[1100px]'}`}>
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                {[
                  ["client", "Client"],
                  ["env", "Env"],
                  ...(!isVault ? [["twins", "Twins"]] : []),
                  ["users", "Users"],
                  ["messages", "Messages"],
                  ["pointsSpent", "Points spent"],
                  ["revenue", "Revenue"],
                  ["cost", "COGS"],
                  ["margin", "Margin%"],
                  ["lastActive", "Last active"],
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
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
                  <td
                    colSpan={isVault ? 9 : 10}
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600 align-[-2px]" aria-hidden="true" />
                    Loading clients...
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={isVault ? 9 : 10} className="px-5 py-12 text-center text-sm text-slate-400">
                    No clients found
                  </td>
                </tr>
              ) : (
                sortedRows.map((client) => (
                  <tr key={client.rowKey} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50" onClick={() => navigate(`/clients/${client.id}`)}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                          {getClientInitials(client.name)}
                        </span>
                        <div className="min-w-0">
                          <strong className="block font-semibold text-slate-700"><TruncatedText value={client.name} /></strong>
                          <span className="mt-0.5 block text-xs text-slate-400"><TruncatedText value={client.plan} /></span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {client.envs.map((env) => (
                          <span key={env} className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                            {envBadge(env)}
                          </span>
                        ))}
                      </div>
                    </td>
                    {!isVault ? <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(client.twins)}</td> : null}
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(client.users)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(client.messages)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(client.pointsSpent)}</td>
                    <td>${formatOptionalNumber(client.revenue)}</td>
                    <td>${formatOptionalNumber(client.cost)}</td>
                    <td className="px-4 py-3.5 font-semibold text-emerald-600">
                      {Math.round(client.margin)}%
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{formatLastActive(client.lastActive)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
