import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { envBadge, formatNumber } from '../../utils/dashboardUtils';
import { formatBytes, formatLastActive, getUserInitials } from '../../utils/vaultFormatters';

const COLUMNS = [
  ['user', 'User'], ['client', 'Client'], ['env', 'Env'],
  ['storage', 'Storage'], ['files', 'Files'], ['lastActive', 'Last active'],
];

const PAGE_SIZE = 10;

export function TopUsersTable({ users, sortConfig, onSort, onExport }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [users]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [currentPage, users]);

  const pageStart = users.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, users.length);

  return (
    <section className="table-card vault-detail-card vault-users-card vault-top-users-card">
      <div className="vault-card-head">
        <h2>Top users by storage</h2>
        <button type="button" className="vault-export-button" onClick={onExport}><Download size={14} />Export CSV</button>
      </div>
      <div className="vault-users-table-wrap">
        <table className="vault-users-table">
          <thead><tr>{COLUMNS.map(([key, label]) => (
            <th key={key}><button type="button" className="table-sort-button" onClick={() => onSort(key)}>
              <span>{label}</span><span className={`table-sort-indicator${sortConfig.key === key ? ' active' : ''}`}>{sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
            </button></th>
          ))}</tr></thead>
          <tbody>{users.length === 0 ? (
            <tr><td colSpan={6} className="table-empty">No storage users found</td></tr>
          ) : paginatedUsers.map((user, index) => (
            <tr key={user.id || `${user.email}-${user.client}-${pageStart + index}`}>
              <td><div className="vault-user-cell"><span className="vault-user-avatar">{getUserInitials(user.name)}</span><strong>{user.name}</strong></div></td>
              <td>{user.client}</td><td>{envBadge(user.env)}</td>
              <td className="cell-primary">{formatBytes(user.storageBytes)}</td>
              <td>{formatNumber(user.files)}</td><td>{formatLastActive(user.lastActive)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {users.length > 0 && (
        <div className="clients-demo-footer vault-users-pagination-footer">
          <span>{pageStart}-{pageEnd} of {users.length}</span>
          <div className="clients-demo-pagination">
            <button
              type="button"
              disabled={currentPage === 1}
              aria-label="Previous page"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              aria-label="Next page"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
