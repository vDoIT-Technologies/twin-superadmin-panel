import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { envBadge, formatNumber } from '../../utils/dashboardUtils';
import { formatBytes, formatLastActive, getUserInitials } from '../../utils/vaultFormatters';
import { TruncatedText } from '../common/TruncatedText';

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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">Top users by storage</h2>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50" onClick={onExport}><Download size={14} />Export CSV</button>
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]"><tr>{COLUMNS.map(([key, label]) => (
            <th key={key} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-400"><button type="button" className="inline-flex items-center gap-1 hover:text-slate-700" onClick={() => onSort(key)}>
              <span>{label}</span><span className={sortConfig.key === key ? 'text-indigo-500' : ''}>{sortConfig.key === key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
            </button></th>
          ))}</tr></thead>
          <tbody>{users.length === 0 ? (
            <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No storage users found</td></tr>
          ) : paginatedUsers.map((user, index) => (
            <tr className="border-t border-slate-100 transition hover:bg-slate-50" key={user.id || `${user.email}-${user.client}-${pageStart + index}`}>
              <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">{getUserInitials(user.name)}</span><strong className="text-slate-700"><TruncatedText value={user.name} /></strong></div></td>
              <td className="px-5 py-4 text-slate-500"><TruncatedText value={user.client} /></td><td className="px-5 py-4">{envBadge(user.env)}</td>
              <td className="px-5 py-4 font-semibold text-slate-700">{formatBytes(user.storageBytes)}</td>
              <td className="px-5 py-4 text-slate-500">{formatNumber(user.files)}</td><td className="px-5 py-4 text-slate-500">{formatLastActive(user.lastActive)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {users.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-400">
          <span>{pageStart}-{pageEnd} of {users.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage === 1}
              aria-label="Previous page"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold text-slate-500">{currentPage} / {totalPages}</span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
