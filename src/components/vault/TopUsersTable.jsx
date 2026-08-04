import { Download } from 'lucide-react';
import { envBadge, formatNumber } from '../../utils/dashboardUtils';
import { formatBytes, formatLastActive, getUserInitials } from '../../utils/vaultFormatters';

const COLUMNS = [
  ['user', 'User'], ['client', 'Client'], ['env', 'Env'],
  ['storage', 'Storage'], ['files', 'Files'], ['lastActive', 'Last active'],
];

export function TopUsersTable({ users, sortConfig, onSort, onExport }) {
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
          ) : users.map((user) => (
            <tr key={user.id || `${user.email}-${user.client}`}>
              <td><div className="vault-user-cell"><span className="vault-user-avatar">{getUserInitials(user.name)}</span><strong>{user.name}</strong></div></td>
              <td>{user.client}</td><td>{envBadge(user.env)}</td>
              <td className="cell-primary">{formatBytes(user.storageBytes)}</td>
              <td>{formatNumber(user.files)}</td><td>{formatLastActive(user.lastActive)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
