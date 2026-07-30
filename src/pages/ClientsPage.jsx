import { useContext, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FilterContext } from '../app/FilterContext';
import { dashboardService } from '../services';
import { envBadge, formatNumber } from '../utils/dashboardUtils';

function getClientInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim().slice(0, 1).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function parseDecimal(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && '$numberDecimal' in value) {
    const parsed = Number(value.$numberDecimal);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatOptionalNumber(value) {
  if (value == null) return '';
  return formatNumber(value);
}

function formatLastActive(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return '1d ago';
  return `${daysAgo}d ago`;
}

function getEnvList(client) {
  // Try envs array first, then fall back to __env
  if (Array.isArray(client.envs) && client.envs.length > 0) return client.envs;
  if (client.__env) return [client.__env];
  return [];
}

function getClientsPayload(response) {
  if (Array.isArray(response?.data)) {
    return {
      clients: response.data,
      pagination: response?.pagination ?? null,
    };
  }

  if (Array.isArray(response?.data?.data)) {
    return {
      clients: response.data.data,
      pagination: response?.data?.pagination ?? response?.pagination ?? null,
    };
  }

  return {
    clients: [],
    pagination: response?.data?.pagination ?? response?.pagination ?? null,
  };
}

export function ClientsPage() {
  const PAGE_SIZE = 10;
  const { filters } = useContext(FilterContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'cost', direction: 'desc' });
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
        console.error('GET /api/v1/entities/clients failed:', error);
        setApiClients([]);
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
      } finally {
        if (isActive) setIsTableLoading(false);
      }
    }

    loadClients();
    return () => { isActive = false; };
  }, [page]);

  const clientRows = useMemo(() => {
    return apiClients.map((client, index) => {
      const name = client.name || client.organizationName || '';
      const plan = client.plan || '';
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
        id: client._id || client.id || `client-row-${index}`,
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

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientRows;
    return clientRows.filter(
      (client) =>
        client.name.toLowerCase().includes(q) ||
        client.plan.toLowerCase().includes(q),
    );
  }, [clientRows, query]);

  const sortedRows = useMemo(() => {
    const getSortValue = (client) => {
      switch (sortConfig.key) {
        case 'client': return client.name;
        case 'env': return client.envs.join(' ');
        case 'twins': return client.twins;
        case 'users': return client.users;
        case 'messages': return client.messages;
        case 'pointsSpent': return client.pointsSpent;
        case 'revenue': return client.revenue;
        case 'cost': return client.cost;
        case 'margin': return client.margin;
        case 'lastActive': return client.lastActive || '';
        default: return client.name;
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

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = Math.min(page, totalPages);
  const pageStart = sortedRows.length === 0 ? 0 : (currentPage - 1) * (pagination.limit || PAGE_SIZE) + 1;
  const pageEnd = sortedRows.length === 0 ? 0 : pageStart + sortedRows.length - 1;

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'client' || key === 'env' || key === 'lastActive' ? 'asc' : 'desc' },
    );
  };

  const exportCsv = () => {
    const header = ['Client', 'Plan', 'Envs', 'Twins', 'Users', 'Messages', 'Points Spent', 'Revenue', 'COGS', 'Margin'];
    const lines = sortedRows.map((client) =>
      [
        client.name,
        client.plan,
        client.envs.join(' | '),
        client.twins,
        client.users,
        formatOptionalNumber(client.messages),
        formatOptionalNumber(client.pointsSpent),
        `$${formatOptionalNumber(client.revenue)}`,
        `$${formatOptionalNumber(client.cost)}`,
        `${Math.round(client.margin)}%`,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clients.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-section clients-page">
      <header className="clients-header">
        <div className="clients-header-copy">
          <h1>Clients</h1>
          <p>White-label tenants — usage, revenue, COGS and margin</p>
        </div>
      </header>

      <section className="table-card clients-demo-card">
        <div className="clients-toolbar">
          <label className="clients-search">
            <Search size={15} className="clients-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Search clients..."
            />
          </label>

          <button type="button" className="clients-export-button" onClick={exportCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="clients-demo-table-wrap">
          <table className="clients-demo-table">
            <thead>
              <tr>
                {[
                  ['client', 'Client'],
                  ['env', 'Env'],
                  ['twins', 'Twins'],
                  ['users', 'Users'],
                  ['messages', 'Messages'],
                  ['pointsSpent', 'Points spent'],
                  ['revenue', 'Revenue'],
                  ['cost', 'COGS'],
                  ['margin', 'Margin%'],
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
                    Loading clients...
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="table-empty">
                    No clients found
                  </td>
                </tr>
              ) : (
                sortedRows.map((client) => (
                  <tr key={client.id} className="entity-row-clickable" onClick={() => navigate(`/clients/${client.id}`)}>
                    <td>
                      <div className="clients-demo-client">
                        <span className="clients-demo-avatar">{getClientInitials(client.name)}</span>
                        <div>
                          <strong>{client.name}</strong>
                          <span>{client.plan}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="clients-demo-envs">
                        {client.envs.map((env) => (
                          <span key={env} className="clients-demo-env-badge">
                            {envBadge(env)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{formatOptionalNumber(client.twins)}</td>
                    <td>{formatOptionalNumber(client.users)}</td>
                    <td>{formatOptionalNumber(client.messages)}</td>
                    <td>{formatOptionalNumber(client.pointsSpent)}</td>
                    <td>${formatOptionalNumber(client.revenue)}</td>
                    <td>${formatOptionalNumber(client.cost)}</td>
                    <td className="clients-demo-margin">{Math.round(client.margin)}%</td>
                    <td>{formatLastActive(client.lastActive)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="clients-demo-footer">
          <span>
            {pageStart}-{pageEnd} of {pagination.total}
          </span>
          <div className="clients-demo-pagination">
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
