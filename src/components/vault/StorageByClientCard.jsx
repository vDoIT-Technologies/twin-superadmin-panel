import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { envBadge, formatNumber } from '../../utils/dashboardUtils';
import { formatStorageGb, getUserInitials } from '../../utils/vaultFormatters';

function StatusBadge({ status }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

export function StorageByClientCard({ clients }) {
  const navigate = useNavigate();
  const totalStorage = Math.max(
    clients.reduce((acc, client) => acc + (Number(client.storageGb) || 0), 0),
    0.001,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel xl:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Storage by client</h2>
          <p className="text-xs text-slate-400">Share of total platform storage used</p>
        </div>
        <span className="text-xs font-medium text-slate-400">Click to drill</span>
      </div>

      <div className="mt-4 space-y-2">
        {clients.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No client storage data found</div>
        ) : (
          clients.map((client) => {
            const sharePercent = ((client.storageGb / totalStorage) * 100).toFixed(1);
            return (
              <button
                key={client.id ? `${client.id}-${client.env}` : `${client.rank}-${client.name}-${client.env}`}
                type="button"
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 disabled:cursor-default"
                onClick={() =>
                  client.id &&
                  navigate(`/clients/${client.id}?tab=vault`, {
                    state: { from: '/vault' },
                  })
                }
                disabled={!client.id}
              >
                <span className="w-4 text-xs font-semibold text-slate-400">{client.rank}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                  {getUserInitials(client.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm text-slate-700" title={client.name}>
                      {client.name}
                    </strong>
                    <span className="flex shrink-0 items-center gap-1">
                      <StatusBadge status={client.status} />
                      {envBadge(client.env)}
                    </span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-sky-400"
                      style={{ width: `${Math.max(0, Math.min(100, (client.storageGb / totalStorage) * 100))}%` }}
                    />
                  </span>
                </span>
                <span className="flex w-24 shrink-0 flex-col text-right">
                  <strong className="text-sm text-slate-700">{formatStorageGb(client.storageGb)}</strong>
                  <span className="text-xs text-slate-400">{sharePercent}% of total</span>
                </span>
                <ChevronRight
                  className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
                  size={16}
                  aria-hidden="true"
                />
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
