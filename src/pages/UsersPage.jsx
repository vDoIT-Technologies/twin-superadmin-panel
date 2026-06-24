import { useContext, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { selectFacts, sumMetric, userShare } from '../demo-data/superadminSelectors';
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

function formatLastActive(daysAgo) {
  return daysAgo <= 0 ? 'today' : `${daysAgo}d ago`;
}

export function UsersPage() {
  const PAGE_SIZE = 12;
  const { filters } = useContext(FilterContext);
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'pointsSpent', direction: 'desc' });
  const [page, setPage] = useState(1);

  const scopedFilters = useMemo(
    () => ({
      ...filters,
      service: null,
      vendor: null,
      twin: null,
      user: null,
    }),
    [filters],
  );

  const rows = useMemo(() => selectFacts(scopedFilters), [scopedFilters]);
  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const userRows = useMemo(() => {
    return superadminDemoData.USERS.filter((user) => (!filters.client ? true : user.clientId === filters.client))
      .filter((user) => filters.envs.includes(user.env))
      .map((user) => {
        const client = superadminDemoData.byId.client(user.clientId);
        const clientFilters = { ...scopedFilters, client: user.clientId };
        const clientRows = rows.filter((row) => row.clientId === user.clientId);
        const share = userShare(user);
        const messages = sumMetric(clientRows, 'messages', clientFilters) * share;
        const sessions = sumMetric(clientRows, 'sessions', clientFilters) * share;
        const pointsSpent = sumMetric(clientRows, 'pointsSpent', clientFilters) * share;
        const value = pointsSpent * superadminDemoData.RATE.pointUSD;

        return {
          id: user.id,
          name: user.name,
          client: client?.name ?? user.clientId,
          env: user.env,
          messages,
          sessions,
          balance: user.pointsBalance,
          pointsSpent,
          value,
          twins: user.twinsUsed,
          lastActiveDaysAgo: user.lastActiveDaysAgo,
          lastActiveLabel: formatLastActive(user.lastActiveDaysAgo),
        };
      })
      .sort((left, right) => right.pointsSpent - left.pointsSpent);
  }, [filters.client, filters.envs, rows, scopedFilters]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return userRows;
    return userRows.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.client.toLowerCase().includes(q) ||
        superadminDemoData.ENV_META[user.env].label.toLowerCase().includes(q),
    );
  }, [query, userRows]);

  const sortedRows = useMemo(() => {
    const getSortValue = (user) => {
      switch (sortConfig.key) {
        case 'user':
          return user.name;
        case 'client':
          return user.client;
        case 'env':
          return superadminDemoData.ENV_META[user.env]?.label ?? user.env;
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

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedRows]);

  const pageStart = sortedRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, sortedRows.length);

  const toggleSort = (key) => {
    setPage(1);
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
        superadminDemoData.ENV_META[user.env].label,
        formatNumber(user.messages),
        formatNumber(user.sessions),
        formatNumber(user.balance),
        formatNumber(user.pointsSpent),
        formatCurrencyFull(user.value),
        user.twins,
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
              {paginatedRows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="users-demo-user">
                      <span className="users-demo-avatar">{getUserInitials(user.name)}</span>
                      <strong>{user.name}</strong>
                    </div>
                  </td>
                  <td>{user.client}</td>
                  <td>{envBadge(user.env)}</td>
                  <td>{formatNumber(user.messages)}</td>
                  <td>{formatNumber(user.sessions)}</td>
                  <td>{formatNumber(user.balance)}</td>
                  <td>{formatNumber(user.pointsSpent)}</td>
                  <td>{formatCurrencyFull(user.value)}</td>
                  <td>{user.twins}</td>
                  <td>{user.lastActiveLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="users-demo-footer">
          <span>
            {pageStart}-{pageEnd} of {sortedRows.length}
          </span>
          <div className="users-demo-pagination">
            <button
              type="button"
              disabled={currentPage === 1}
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
              disabled={currentPage === totalPages}
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
