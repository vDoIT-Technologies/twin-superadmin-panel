import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { dashboardService } from '../services';
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

  return {
    users: [],
    pagination: response?.data?.pagination ?? response?.pagination ?? null,
  };
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

        console.log('GET /api/v1/entities/users response:', data);
        console.log('UsersPage extracted payload:', payload);
        setApiUsers(payload.users);
        setPagination({
          total: Number(payload.pagination?.total) || 0,
          page: Number(payload.pagination?.page) || page,
          limit: Number(payload.pagination?.limit) || PAGE_SIZE,
          totalPages: Number(payload.pagination?.totalPages) || 1,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error('GET /api/v1/entities/users failed:', error);
        setApiUsers([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          totalPages: 1,
        }));
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

  useEffect(() => {
    console.log('UsersPage filters:', filters);
  }, [filters]);

  useEffect(() => {
    console.log('UsersPage raw apiUsers:', apiUsers);
  }, [apiUsers]);

  useEffect(() => {
    console.log('UsersPage pagination:', pagination);
  }, [pagination]);

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

        return {
          id: user?._id || user?.id || user?.email || `user-row-${index}`,
          name: fullName || user?.email || '',
          client: clientName,
          clientId: user?.clientId ?? null,
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
      .filter((user) => (!filters.client ? true : user.clientId === filters.client))
      .filter((user) => (!filters.user ? true : String(user.id) === String(filters.user)))
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

    console.log('UsersPage filteredRows:', {
      query,
      count: nextRows.length,
      rows: nextRows,
    });

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

    console.log('UsersPage sortedRows:', {
      sortConfig,
      count: nextRows.length,
      rows: nextRows,
    });

    return nextRows;
  }, [filteredRows, sortConfig]);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = sortedRows;
  const pageStart = paginatedRows.length === 0 ? 0 : (currentPage - 1) * (pagination.limit || PAGE_SIZE) + 1;
  const pageEnd = paginatedRows.length === 0 ? 0 : pageStart + paginatedRows.length - 1;

  useEffect(() => {
    console.log('UsersPage table state:', {
      page,
      currentPage,
      totalPages,
      pageStart,
      pageEnd,
      paginatedRows,
    });
  }, [page, currentPage, totalPages, pageStart, pageEnd, paginatedRows]);

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
    <section className="page-section users-page">
      <header className="users-header">
        <div className="users-header-copy">
          <h1>Users</h1>
          <p>End users — sessions, points balance and spend</p>
        </div>
        <div className="users-scope">
          <span className="users-scope-label">Scope</span>
          <span className="users-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <section className="table-card users-demo-card">
        <div className="users-toolbar">
          <label className="users-search">
            <Search size={15} className="users-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search users..."
            />
          </label>

          <button type="button" className="users-export-button" onClick={exportCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="users-demo-table-wrap">
          <table className="users-demo-table">
            <thead>
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
              {isTableLoading ? (
                <tr>
                  <td colSpan={10} className="table-empty users-table-loading-cell">
                    <span className="users-table-loader" aria-hidden="true" />
                    Loading users...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="table-empty">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((user) => (
                  <tr key={user.id} className="entity-row-clickable" onClick={() => navigate(`/users/${user.id}`)}>
                    <td>
                      <div className="users-demo-user">
                        <span className="users-demo-avatar">{getUserInitials(user.name || '?')}</span>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td>{user.client}</td>
                    <td>{superadminDemoData.ENV_META[user.env] ? envBadge(user.env) : getEnvLabel(user.env)}</td>
                    <td>{formatOptionalNumber(user.messages)}</td>
                    <td>{formatOptionalNumber(user.sessions)}</td>
                    <td>{formatOptionalNumber(user.balance)}</td>
                    <td>{formatOptionalNumber(user.pointsSpent)}</td>
                    <td>{formatOptionalCurrency(user.value)}</td>
                    <td>{user.twins ?? ''}</td>
                    <td>{user.lastActiveLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="users-demo-footer">
          <span>
            {pageStart}-{pageEnd} of {pagination.total}
          </span>
          <div className="users-demo-pagination">
            <button
              type="button"
              disabled={currentPage === 1 || isTableLoading}
              aria-label="Previous page"
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
