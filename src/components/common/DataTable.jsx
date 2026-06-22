import { getStatusTone } from '../../utils/status';

export function DataTable({
  columns,
  rows,
  statusKey,
  rowKey = 'id',
  onRowClick,
  emptyMessage = 'No data to display',
}) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
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
