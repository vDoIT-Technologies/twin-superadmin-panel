import { useMemo, useState } from 'react';
import { getStatusTone } from '../../utils/status';

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
    <div className="table-card">
      <table>
        <thead>
          <tr>
            {columns.map((column) => {
              const isActive = sortConfig.key === column.key;
              return (
                <th key={column.key}>
                  <button type="button" className="table-sort-button" onClick={() => toggleSort(column.key)}>
                    <span>{column.label}</span>
                    <span className={`table-sort-indicator${isActive ? ' active' : ''}`}>
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
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr
                key={row[rowKey]}
                className={onRowClick ? 'row-link' : ''}
                onClick={onRowClick ? () => onRowClick(row[rowKey]) : undefined}
              >
                {columns.map((column) => {
                  const value = column.render ? column.render(row) : row[column.key];
                  const isStatus = column.key === statusKey;
                  const isPrimary = column.key === 'name';

                  return (
                    <td key={column.key} className={isPrimary ? 'cell-primary' : ''}>
                      {isStatus ? <span className={`pill ${getStatusTone(String(value))}`}>{value}</span> : value}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
