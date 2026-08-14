import { useMemo, useState } from 'react';
import { getStatusTone } from '../../utils/status';
import { TruncatedText } from './TruncatedText';

export function DataTable({
  columns,
  rows,
  statusKey,
  rowKey = 'id',
  onRowClick,
  emptyMessage = 'No data to display',
}) {
  const [sortConfig, setSortConfig] = useState(() => ({
    key: columns[0]?.key ?? null,
    direction: 'asc',
  }));

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;

    const column = columns.find((item) => item.key === sortConfig.key);
    if (!column) return rows;

    const getValue = (row) => {
      if (column.sortValue) return column.sortValue(row);
      return row[column.key];
    };

    return [...rows].sort((left, right) => {
      const a = getValue(left);
      const b = getValue(right);

      if (typeof a === 'number' && typeof b === 'number') {
        return sortConfig.direction === 'asc' ? a - b : b - a;
      }

      return sortConfig.direction === 'asc'
        ? String(a ?? '').localeCompare(String(b ?? ''))
        : String(b ?? '').localeCompare(String(a ?? ''));
    });
  }, [columns, rows, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="max-h-[65vh] overflow-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left [&_td]:!text-left [&_td>div]:justify-start [&_th]:!text-left">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
            <tr>
              {columns.map((column) => {
                const isActive = sortConfig.key === column.key;
                const alignment = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
                return (
                  <th key={column.key} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 first:pl-5 ${alignment}`}>
                    <button type="button" className="inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-indigo-600" onClick={() => toggleSort(column.key)}>
                      <span>{column.label}</span>
                      <span className={isActive ? 'font-bold text-indigo-500' : 'text-slate-300'}>
                        {isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr
                  key={row[rowKey]}
                  className={`border-t border-slate-100 text-sm text-slate-600 transition ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row[rowKey]) : undefined}
                >
                  {columns.map((column) => {
                    const value = column.render ? column.render(row) : row[column.key];
                    const isStatus = column.key === statusKey;
                    const isPrimary = column.key === 'name';
                    const alignment = column.align === 'right' ? 'text-right tabular-nums' : column.align === 'center' ? 'text-center' : 'text-left';

                    return (
                      <td key={column.key} className={`${isPrimary ? 'font-medium text-slate-800' : ''} px-4 py-4 first:pl-5 ${alignment}`}>
                        {isStatus
                          ? <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(String(value))}`}>{value}</span>
                          : typeof value === 'string'
                            ? <TruncatedText value={value} />
                            : value}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
