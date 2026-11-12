import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, History, RefreshCw, AlertTriangle } from 'lucide-react';
import { voiceService } from '../services/voiceService';
import { envBadge } from '../utils/dashboardUtils';

const PAGE_SIZE = 20;

const formatTs = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '—';

const TH = 'px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400';

function EnvCell({ value }) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  if (list.length === 0) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((env) => (
        <span key={env}>{envBadge(env)}</span>
      ))}
    </div>
  );
}

export function DeletionHistoryPage({ onBack }) {
  const [page, setPage] = useState(1);
  const [prodOnly, setProdOnly] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['deletionLogs', page, prodOnly],
    queryFn: () => voiceService.listDeletions({ page, limit: PAGE_SIZE, prodOnly }),
    keepPreviousData: true,
    placeholderData: (prev) => prev,
  });

  const logs = data?.logs || [];
  const total = data?.total ?? 0;
  const totalPages = data?.pages || 1;

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : null}
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
              <History size={22} /> Deletion History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Audit log of every voice deletion attempt.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={prodOnly}
              onChange={(e) => {
                setProdOnly(e.target.checked);
                setPage(1);
              }}
            />
            Production only
          </label>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="max-h-[calc(100vh-17rem)] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className={TH}>Date &amp; Time</th>
                <th className={TH}>Voice</th>
                <th className={TH}>Deleted By</th>
                <th className={TH}>Production</th>
                <th className={TH}>Environments</th>
                <th className={TH}>Mode</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    <RefreshCw className="mx-auto mb-2 animate-spin text-indigo-400" size={20} />
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-rose-500">
                    Failed to load history: {error?.response?.data?.message || error.message}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    No deletions recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr
                    key={l._id}
                    className={`border-t border-slate-100 align-top hover:bg-slate-50/60 ${l.wasProduction ? 'bg-rose-50/30' : ''
                      }`}
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                      {formatTs(l.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{l.voiceName || '—'}</p>
                      <p className="mt-0.5 break-all font-mono text-[10px] text-slate-500">
                        {l.voiceId}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{l.deletedBy || '—'}</p>
                      {l.deletedByRole ? (
                        <p className="mt-0.5 text-xs text-slate-500">{l.deletedByRole}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      {l.wasProduction ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          <AlertTriangle size={11} /> Production
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <EnvCell value={l.environments ?? l.environment} />
                    </td>
                    <td className="px-5 py-4 text-xs capitalize text-slate-600">
                      {l.mode || (l.bulk ? 'Bulk' : '—')}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${l.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                          }`}
                      >
                        {l.status === 'success' ? 'Deleted' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-sm text-slate-500">
          <span>
            <strong className="text-slate-700">{total}</strong> deletion record(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export const DeletionHistoryPanel = DeletionHistoryPage;
export default DeletionHistoryPage;