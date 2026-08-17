import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { useEntityFilters } from '../app/FilterContext';
import { TruncatedText } from '../components/common/TruncatedText';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { dashboardService, dropdownApiAvailable, getClientsDropdown, getUsersDropdown } from '../services';
import { envBadge, formatCurrencyFull, formatNumber } from '../utils/dashboardUtils';
import { normalizeEntityStatus } from '../utils/status';
import { getEntityFilterParams } from '../utils/entityFilters';

function getUserInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim().slice(0, 1).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getEnvLabel(env) {
  return superadminDemoData.ENV_META[env]?.label ?? env ?? '';
}

function parseDecimal(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object' && '$numberDecimal' in value) {
    const parsed = Number(value.$numberDecimal);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatOptionalNumber(value) {
  return value == null ? '---' : formatNumber(value);
}

function formatOptionalCurrency(value) {
  return value == null ? '---' : formatCurrencyFull(value);
}

function getUsersPayload(response) {
  if (Array.isArray(response)) {
    return {
      users: response,
      pagination: null,
    };
  }

  if (Array.isArray(response?.users)) {
    return {
      users: response.users,
      pagination: response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.items)) {
    return {
      users: response.items,
      pagination: response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data)) {
    return {
      users: response.data,
      pagination: response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data?.data)) {
    return {
      users: response.data.data,
      pagination: response?.data?.pagination ?? response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data?.users)) {
    return {
      users: response.data.users,
      pagination: response?.data?.pagination ?? response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data?.items)) {
    return {
      users: response.data.items,
      pagination: response?.data?.pagination ?? response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data?.data?.data)) {
    return {
      users: response.data.data.data,
      pagination: response.data.data.pagination ?? response?.pagination ?? null,
    };
  }

  return {
    users: [],
    pagination: response?.data?.pagination ?? response?.pagination ?? null,
  };
}

function getId(value) {
  const id = value?._id ?? value?.id ?? value;
  return id == null ? '' : String(id);
}

export function UsersPage() {
  const { adminProduct } = useAuth();
  const isVault = adminProduct === 'vault';
  const PAGE_SIZE = 10;
  const [filters, setFilters] = useEntityFilters('users');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'pointsSpent', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [apiUsers, setApiUsers] = useState([]);
  const [clientNamesById, setClientNamesById] = useState({});
  const [userEnrichmentByKey, setUserEnrichmentByKey] = useState({});
  const [clientFilterOptions, setClientFilterOptions] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });

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
    }).catch((error) => console.error('User table filters failed to load:', error));
    return () => { active = false; };
  }, [filters.envs]);

  const updateTableFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'client' ? { twin: null, user: null } : {}),
      ...(key === 'twin' ? { user: null } : {}),
    }));
  };

  useEffect(() => {
    let isActive = true;

    const loadDropdownFallback = async () => {
      const selectedEnv = filters.envs.length === 1 ? filters.envs[0] : undefined;
      const dropdownUsers = await getUsersDropdown({
        env: selectedEnv,
        clientId: filters.client || undefined,
      });
      const total = dropdownUsers.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;

      if (!isActive) return;

      setApiUsers(dropdownUsers.slice(start, start + PAGE_SIZE));
      setPagination({
        total,
        page: currentPage,
        limit: PAGE_SIZE,
        totalPages,
      });
    };

    async function loadEntityUsers() {
      setIsTableLoading(true);

      try {
        const data = await dashboardService.getEntityUsers({
          page,
          limit: PAGE_SIZE,
          clientId: filters.client,
          env: filters.envs.length === 1 ? filters.envs[0] : undefined,
          ...getEntityFilterParams(filters.entityRange),
        });

        if (!isActive) {
          return;
        }

        const payload = getUsersPayload(data);
        setApiUsers(payload.users);
        setPagination({
          total: Number(payload.pagination?.total) || payload.users.length,
          page: Number(payload.pagination?.page) || page,
          limit: Number(payload.pagination?.limit) || PAGE_SIZE,
          totalPages: Number(payload.pagination?.totalPages) || 1,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('GET /api/v1/entities/users failed:', error);
        if (!dropdownApiAvailable()) {
          setApiUsers([]);
          setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
          return;
        }

        try {
          await loadDropdownFallback();
        } catch (fallbackError) {
          console.error('GET /api/v1/dropdown/users fallback failed:', fallbackError);
          setApiUsers([]);
          setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
        }
      } finally {
        if (isActive) {
          setIsTableLoading(false);
        }
      }
    }

    loadEntityUsers();

    return () => {
      isActive = false;
    };
  }, [filters.client, filters.entityRange, filters.envs, page]);

  useEffect(() => {
    if (!isVault) {
      setUserEnrichmentByKey({});
      return undefined;
    }

    let isActive = true;
    const selectedEnv = filters.envs.length === 1 ? filters.envs[0] : undefined;

    getClientsDropdown({ env: selectedEnv })
      .then(async (clients) => {
        if (!isActive) return;
        const clientEntries = clients.map((client) => {
          const id = getId(client?._id ?? client?.id ?? client?.clientId);
          const name = client?.clientName ?? client?.name ?? client?.companyName ?? '';
          return [id, name];
        }).filter(([id, name]) => id && name);
        setClientNamesById(Object.fromEntries(clientEntries));

        const clientUsersResults = await Promise.allSettled(
          clientEntries.map(async ([clientId, clientName]) => {
            const response = await dashboardService.getEntityClientUsers(clientId);
            return { clientId, clientName, users: getUsersPayload(response).users };
          }),
        );

        if (!isActive) return;
        const enrichment = {};
        clientUsersResults.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          const { clientId, clientName, users } = result.value;
          users.forEach((user) => {
            const keys = [
              getId(user?._id ?? user?.id ?? user?.userId),
              typeof user?.email === 'string' ? user.email.toLowerCase() : '',
            ].filter(Boolean);
            const value = { ...user, clientId, clientName };
            keys.forEach((key) => { enrichment[key] = value; });
          });
        });
        setUserEnrichmentByKey(enrichment);
      })
      .catch((error) => {
        console.error('GET /api/v1/dropdown/clients failed:', error);
        if (isActive) {
          setClientNamesById({});
          setUserEnrichmentByKey({});
        }
      });

    return () => { isActive = false; };
  }, [filters.envs, isVault]);

  useEffect(() => {
    setPage(1);
  }, [filters.client, filters.entityRange, filters.envs]);

  const userRows = useMemo(() => {
    return apiUsers
      .map((user, index) => {
        const userKey = getId(user?._id ?? user?.id ?? user?.userId);
        const emailKey = typeof user?.email === 'string' ? user.email.toLowerCase() : '';
        const enrichment = userEnrichmentByKey[userKey] ?? userEnrichmentByKey[emailKey] ?? {};
        const firstName = user?.firstName?.trim?.() ?? '';
        const lastName = user?.lastName?.trim?.() ?? '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        const environment = user?.__env ?? user?.env ?? user?.environment ?? user?.environmentName ?? enrichment?.__env ?? enrichment?.env ?? enrichment?.environment;
        const env = typeof environment === 'string'
          ? environment.toLowerCase()
          : environment?.id ?? environment?.name ?? environment?.slug ?? '';
        const clientId = getId(user?.clientId ?? user?.client?._id ?? user?.client?.id ?? enrichment?.clientId);
        const clientName = user?.clientName
          ?? user?.client?.name
          ?? user?.client?.clientName
          ?? enrichment?.clientName
          ?? enrichment?.client?.name
          ?? clientNamesById[clientId]
          ?? '';
        const totalPoints = parseDecimal(user?.totalPoints ?? enrichment?.totalPoints ?? 0);
        const pointsSpent = parseDecimal(user?.pointsSpent ?? enrichment?.pointsSpent ?? 0);
        const cost = parseDecimal(user?.cost?.totalAmount ?? enrichment?.cost?.totalAmount ?? 0, 2);
        const revenue = parseDecimal(user?.revenue?.totalAmount ?? enrichment?.revenue?.totalAmount ?? 0, 2);
        const lastDaysAgo = user?.lastActiveDaysAgo;
        let lastActiveLabel = '';
        if (lastDaysAgo != null) {
          lastActiveLabel = lastDaysAgo <= 0 ? 'today' : `${lastDaysAgo}d ago`;
        } else if (user?.updatedAt) {
          const days = Math.floor((Date.now() - new Date(user.updatedAt).getTime()) / 86400000);
          lastActiveLabel = days <= 0 ? 'today' : `${days}d ago`;
        }

        const suppliedName = typeof user?.name === 'string' ? user.name.trim() : '';
        const rawStatus = user?.status ?? user?.userStatus ?? user?.state;
        const explicitActive = user?.isActive ?? user?.active ?? user?.enabled;
        const status = normalizeEntityStatus(rawStatus, explicitActive);

        return {
          id: getId(user?._id ?? user?.id) || user?.email || `user-row-${index}`,
          name: fullName || suppliedName || user?.email || '',
          client: clientName,
          clientId,
          env,
          messages: parseDecimal(user?.messages),
          sessions: parseDecimal(user?.sessions),
          balance,
          cost,
          revenue,
          pointsSpent,
          status,
          lastActiveDaysAgo: lastDaysAgo,
          lastActiveLabel,
        };
      })
      .filter((user) => (user.env ? filters.envs.includes(user.env) : true));
  }, [apiUsers, clientNamesById, filters.envs, userEnrichmentByKey]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedClientId = getId(filters.client);
    const selectedClientName = selectedClientId
      ? clientNamesById[selectedClientId]?.trim().toLowerCase()
      : '';

    return userRows.filter((user) => {
      const matchesClient = !selectedClientId
        || user.clientId === selectedClientId
        || (selectedClientName && user.client.trim().toLowerCase() === selectedClientName);
      const matchesStatus = !filters.status || user.status === filters.status;
      const matchesQuery = !q
        || user.name.toLowerCase().includes(q)
        || user.client.toLowerCase().includes(q)
        || getEnvLabel(user.env).toLowerCase().includes(q);
      return matchesClient && matchesStatus && matchesQuery;
    });
  }, [clientNamesById, filters.client, filters.status, query, userRows]);

  const sortedRows = useMemo(() => {
    const getSortValue = (user) => {
      switch (sortConfig.key) {
        case 'user':
          return user.name;
        case 'client':
          return user.client;
        case 'env':
          return getEnvLabel(user.env);
        case 'messages':
          return user.messages;
        case 'sessions':
          return user.sessions;
        case 'totalPoints':
          return user.totalPoints;
        case 'cost':
          return user.cost;
        case 'revenue':
          return user.revenue;
        case 'pointsSpent':
          return user.pointsSpent;
        case 'lastActive':
          return user.lastActiveDaysAgo;
        default:
          return user.pointsSpent;
      }
    };

    const nextRows = [...filteredRows].sort((left, right) => {
      const a = getSortValue(left);
      const b = getSortValue(right);

      if (typeof a === 'number' && typeof b === 'number') {
        return sortConfig.direction === 'asc' ? a - b : b - a;
      }

      return sortConfig.direction === 'asc'
        ? String(a).localeCompare(String(b))
        : String(b).localeCompare(String(a));
    });

    return nextRows;
  }, [filteredRows, sortConfig]);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = sortedRows;
  const pageStart = paginatedRows.length === 0 ? 0 : (currentPage - 1) * (pagination.limit || PAGE_SIZE) + 1;
  const pageEnd = paginatedRows.length === 0 ? 0 : pageStart + paginatedRows.length - 1;

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'user' || key === 'client' || key === 'env' ? 'asc' : 'desc' },
    );
  };

  const exportCsv = () => {
    const header = ['User', 'Env', 'Client', 'Cost', 'Revenue', 'Total Points', 'Points Spent', 'Messages', 'Sessions'];
    const lines = sortedRows.map((user) =>
      [
        user.name,
        getEnvLabel(user.env),
        user.client || '---',
        formatOptionalCurrency(user.cost),
        formatOptionalCurrency(user.revenue),
        formatOptionalNumber(user.totalPoints),
        formatOptionalNumber(user.pointsSpent),
        formatOptionalNumber(user.messages),
        formatOptionalNumber(user.sessions),
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users.csv';
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
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search users..."
            />
          </label>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <FilterDropdown
              value={filters.envs.length === 1 ? filters.envs[0] : null}
              onChange={(value) => updateTableFilter('envs', value ? [value] : ['dev', 'staging', 'prod'])}
              options={[{ value: 'dev', label: 'Development' }, { value: 'staging', label: 'Staging' }, { value: 'prod', label: 'Production' }]}
              placeholder="All environments"
              searchable={false}
              tone={isVault ? 'vault' : 'twin'}
            />
            
            <FilterDropdown
                value={filters.entityRange === 'all' ? null : filters.entityRange}
                onChange={(value) => updateTableFilter('entityRange', value || 'all')}
                options={[
                  { value: '7days', label: 'LAST 7 DAYS' },
                  { value: '1month', label: 'LAST 1 MONTH' },
                  { value: '6months', label: 'LAST 6 MONTHS' },
                  { value: '1year', label: 'LAST 1 YEAR' },
                  { value: 'morethan1year', label: 'MORE THAN 1 YEAR' },
              ]}
              placeholder="All Dates"
              searchable={false}
              align="right"
              tone={isVault ? 'vault' : 'twin'}
            />
            <FilterDropdown value={filters.client} onChange={(value) => updateTableFilter('client', value)} options={clientFilterOptions} placeholder="All clients" searchPlaceholder="Search client..." tone={isVault ? 'vault' : 'twin'} />
          </div>

          <button type="button" className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition ${isVault ? 'hover:border-emerald-300 hover:text-emerald-700' : 'hover:border-indigo-300 hover:text-indigo-600'}`} onClick={exportCsv}>
            <Download size={14} />
            Export CSV
          </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto">
          <table className="min-w-[1380px] w-full border-collapse text-sm [&_td]:!text-left [&_td>div]:justify-start [&_th]:!text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                {[
                  ['user', 'User'],
                  ['env', 'Env'],
                  ['client', 'Client'],
                  ['cost', 'Cost'],
                  ['revenue', 'Revenue'],
                  ['totalPoints', 'Total Points'],
                  ['pointsSpent', 'Points spent'],
                  ['messages', 'Messages'],
                  ['sessions', 'Sessions'],
                ].map(([key, label]) => (
                  <th key={key} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 ${key === 'user' || key === 'client' ? 'text-left' : key === 'env' ? 'text-center' : 'text-right'}`}>
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
              {isTableLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-400">
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600 align-[-2px]" aria-hidden="true" />
                    Loading users...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((user) => (
                  <tr key={user.id} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50" onClick={() => navigate(`/users/${user.id}`)}>
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">{getUserInitials(user.name || '?')}</span>
                        <strong className="font-semibold text-slate-700"><TruncatedText value={user.name} /></strong>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-500">{superadminDemoData.ENV_META[user.env] ? envBadge(user.env) : getEnvLabel(user.env)}</td>
                    <td className="px-4 py-3.5 text-slate-500"><TruncatedText value={user.client || '---'} /></td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalCurrency(user.cost)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalCurrency(user.revenue)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{user.totalPoints}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{user.pointsSpent}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(user.messages)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-500">{formatOptionalNumber(user.sessions)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-400">
          <span>
            {pageStart}-{pageEnd} of {pagination.total}
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
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages || isTableLoading}
              aria-label="Next page"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
