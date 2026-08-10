import { AlertTriangle } from 'lucide-react';
import { formatBytes, formatQuotaPercent } from '../../utils/vaultFormatters';

export function VaultQuotaCard({ percentage, storageUsed, storageLimit }) {
  const hasLimit = storageLimit != null && Number(storageLimit) > 0 && String(storageLimit) !== 'unlimited';
  const boundedPercentage = hasLimit ? Math.min(100, Math.max(0, Number(percentage) || 0)) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel xl:col-span-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Filebase quota</h2>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${hasLimit ? (percentage >= 80 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700') : 'bg-indigo-50 text-indigo-700'}`}>
          {hasLimit ? `${formatQuotaPercent(percentage)} Used` : 'Pay-As-You-Go'}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col">
            <strong className="text-3xl font-bold tracking-tight text-slate-800">{formatBytes(storageUsed)}</strong>
            <span className="mt-1 text-sm text-slate-400">
              {hasLimit ? `of ${formatBytes(storageLimit)} provisioned limit` : 'Total pinned storage'}
            </span>
          </div>
        </div>

        {hasLimit ? (
          <>
            <div className="mt-5 flex items-center gap-3" role="progressbar" aria-label="Filebase quota used" aria-valuemin="0" aria-valuemax="100" aria-valuenow={boundedPercentage}>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className={`block h-full rounded-full ${boundedPercentage >= 85 ? 'bg-rose-500' : boundedPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${boundedPercentage}%` }} />
              </div>
              <span className="text-sm font-semibold text-slate-500">{formatQuotaPercent(percentage)}</span>
            </div>

            <div className={`mt-5 flex gap-3 rounded-xl border px-4 py-3 text-sm ${boundedPercentage >= 80 ? 'border-amber-200 bg-amber-50 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-slate-600'}`}>
              <span className={`shrink-0 ${boundedPercentage >= 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                <AlertTriangle size={16} />
              </span>
              <p>{boundedPercentage >= 80 ? 'Filebase is approaching its provisioned quota threshold.' : 'Filebase storage is operating within normal parameters.'}</p>
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs">
              <span className="font-medium text-slate-500">Storage Mode</span>
              <span className="font-semibold text-indigo-600">Auto-scaling IPFS Pinning</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs">
              <span className="font-medium text-slate-500">Monthly Tier Status</span>
              <span className="font-semibold text-emerald-600">Healthy (Uncapped)</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
