import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { dashboardService, getUsersDropdown } from '../services';
import { envBadge, formatCurrencyFull, formatNumber } from '../utils/dashboardUtils';

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

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

function getTwinCount(twinIds) {
  if (Array.isArray(twinIds)) {
    return twinIds.length;
  }

  if (twinIds == null) {
    return 0;
  }

  if (typeof twinIds === 'object') {
    return Object.keys(twinIds).length;
  }

  return 1;
}

function formatOptionalNumber(value) {
  return value == null ? '' : formatNumber(value);
}

function formatOptionalCurrency(value) {
  return value == null ? '' : formatCurrencyFull(value);
}

function getUsersPayload(response) {
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
  const PAGE_SIZE = 12;
  const { filters } = useContext(FilterContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'pointsSpent', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [apiUsers, setApiUsers] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });

  useEffect(() => {
    let isActive = true;

    const loadDropdownFallback = async () => {
      const selectedEnv = filters.envs.length === 1 ? filters.envs[0] : undefined;
      const dropdownUsers = await getUsersDropdown({
        env: selectedEnv,
        clientId: filters.client || undefined,
      });
      const scopedUsers = dropdownUsers
        .filter((user) => !filters.client || getId(user.clientId ?? user.client) === String(filters.client))
        .filter((user) => !filters.user || getId(user.id ?? user._id) === String(filters.user));
      const total = scopedUsers.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;

      if (!isActive) return;

      setApiUsers(scopedUsers.slice(start, start + PAGE_SIZE));
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
          userId: filters.user,
          env: filters.envs.length === 1 ? filters.envs[0] : undefined,
          range: filters.range,
        });

        if (!isActive) {
          return;
        }

        const payload = getUsersPayload(data);

        if (payload.users.length) {
          setApiUsers(payload.users);
          setPagination({
            total: Number(payload.pagination?.total) || payload.users.length,
            page: Number(payload.pagination?.page) || page,
            limit: Number(payload.pagination?.limit) || PAGE_SIZE,
            totalPages: Number(payload.pagination?.totalPages) || 1,
          });
        } else {
          await loadDropdownFallback();
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('GET /api/v1/entities/users failed:', error);
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
  }, [filters.client, filters.envs, filters.range, filters.user, page]);

  useEffect(() => {
    setPage(1);
  }, [filters.client, filters.envs, filters.range, filters.user]);

  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const userRows = useMemo(() => {
    return apiUsers
      .map((user, index) => {
        const firstName = user?.firstName?.trim?.() ?? '';
        const lastName = user?.lastName?.trim?.() ?? '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        const env = user?.__env ?? '';
        // Backend sends clientName as flat string, not nested object
        const clientName = user?.clientName ?? user?.client?.name ?? '';
        const balance = parseDecimal(user?.points);
        const twinCount = getTwinCount(user?.twinIds);
        const pointsSpent = parseDecimal(user?.pointsSpent);
        const lastDaysAgo = user?.lastActiveDaysAgo;
        let lastActiveLabel = '';
        if (lastDaysAgo != null) {
          lastActiveLabel = lastDaysAgo <= 0 ? 'today' : `${lastDaysAgo}d ago`;
        } else if (user?.updatedAt) {
          const days = Math.floor((Date.now() - new Date(user.updatedAt).getTime()) / 86400000);
          lastActiveLabel = days <= 0 ? 'today' : `${days}d ago`;
        }

        const suppliedName = typeof user?.name === 'string' ? user.name.trim() : '';

        return {
          id: getId(user?._id ?? user?.id) || user?.email || `user-row-${index}`,
          name: fullName || suppliedName || user?.email || '',
          client: clientName,
          clientId: getId(user?.clientId ?? user?.client?._id ?? user?.client?.id),
          env,
          messages: user?.messages ?? 0,
          sessions: user?.sessions ?? 0,
          balance,
          pointsSpent,
          value: pointsSpent ? pointsSpent * 0.01 : 0,
          twins: twinCount,
          lastActiveDaysAgo: lastDaysAgo,
          lastActiveLabel,
        };
      })
      .filter((user) => (!filters.client ? true : user.clientId === String(filters.client)))
      .filter((user) => (!filters.user ? true : user.id === String(filters.user)))
      .filter((user) => (user.env ? filters.envs.includes(user.env) : true));
  }, [apiUsers, filters.client, filters.envs, filters.user]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nextRows = !q
      ? userRows
      : userRows.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.client.toLowerCase().includes(q) ||
        getEnvLabel(user.env).toLowerCase().includes(q),
    );

    return nextRows;
  }, [query, userRows]);

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
        case 'balance':
          return user.balance;
        case 'pointsSpent':
          return user.pointsSpent;
        case 'value':
          return user.value;
        case 'twins':
          return user.twins;
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
    const header = ['User', 'Client', 'Env', 'Messages', 'Sessions', 'Balance', 'Points Spent', '$ Value', 'Twins', 'Last Active'];
    const lines = sortedRows.map((user) =>
      [
        user.name,
        user.client,
        getEnvLabel(user.env),
        formatOptionalNumber(user.messages),
        formatOptionalNumber(user.sessions),
        formatOptionalNumber(user.balance),
        formatOptionalNumber(user.pointsSpent),
        formatOptionalCurrency(user.value),
        user.twins ?? '',
        user.lastActiveLabel,
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-400">End users — sessions, points balance and spend</p>
        </div>
        <div className="text-right">
          <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Scope</span>
          <span className="mt-1 block text-sm font-semibold text-slate-500">{scopeLabel}</span>
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
                setPage(1);
              }}
              placeholder="Search users..."
            />
          </label>

          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600" onClick={exportCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  ['user', 'User'],
                  ['client', 'Client'],
                  ['env', 'Env'],
                  ['messages', 'Messages'],
                  ['sessions', 'Sessions'],
                  ['balance', 'Balance'],
                  ['pointsSpent', 'Points spent'],
                  ['value', '$ Value'],
                  ['twins', 'Twins'],
                  ['lastActive', 'Last active'],
                ].map(([key, label]) => (
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
              {isTableLoading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-400">
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600 align-[-2px]" aria-hidden="true" />
                    Loading users...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((user) => (
                  <tr key={user.id} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50" onClick={() => navigate(`/users/${user.id}`)}>
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">{getUserInitials(user.name || '?')}</span>
                        <strong className="truncate font-semibold text-slate-700">{user.name}</strong>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{user.client}</td>
                    <td className="px-4 py-3.5 text-slate-500">{superadminDemoData.ENV_META[user.env] ? envBadge(user.env) : getEnvLabel(user.env)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(user.messages)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(user.sessions)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(user.balance)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalNumber(user.pointsSpent)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatOptionalCurrency(user.value)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{user.twins ?? ''}</td>
                    <td className="px-4 py-3.5 text-slate-500">{user.lastActiveLabel}</td>
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
