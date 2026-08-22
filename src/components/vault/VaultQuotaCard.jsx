import { AlertTriangle, Database } from 'lucide-react';
import { formatQuotaPercent } from '../../utils/vaultFormatters';

function formatStorageGb(value) {
  const amount = Number(value) || 0;
  if (amount >= 1024) {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount / 1024)} TB`;
  }
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)} GB`;
}

export function VaultQuotaCard({ percentage, storageUsed, storageLimit, product = 'vault', variant = 'card' }) {
  const hasLimit = storageLimit != null && Number(storageLimit) > 0 && String(storageLimit) !== 'unlimited';
  const boundedPercentage = hasLimit ? Math.min(100, Math.max(0, Number(percentage) || 0)) : null;
  const isTwin = product === 'twin';
  const healthyBadgeTone = isTwin ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700';
  const healthyProgressTone = isTwin ? 'bg-indigo-500' : 'bg-emerald-500';
  const healthyPanelTone = isTwin
    ? 'border-indigo-200 bg-indigo-50 text-slate-600'
    : 'border-emerald-200 bg-emerald-50 text-slate-600';
  const healthyIconTone = isTwin ? 'text-indigo-500' : 'text-emerald-500';

  if (variant === 'overview') {
    const progressTone = boundedPercentage >= 85 ? 'bg-rose-500' : boundedPercentage >= 70 ? 'bg-amber-500' : healthyProgressTone;

    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-panel transition hover:-translate-y-0.5 hover:shadow-floating sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">Filebase quota</h2>
          <span className={`inline-flex shrink-0 rounded-full px-4 py-1.5 text-base font-semibold sm:px-5 sm:text-xl ${hasLimit && boundedPercentage >= 80 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {hasLimit ? `${formatQuotaPercent(percentage)} Used` : 'Pay-As-You-Go'}
          </span>
        </div>

        <div className="mt-10">
          <strong className="text-5xl font-bold tracking-tight text-slate-800 sm:text-6xl">{formatStorageGb(storageUsed)}</strong>
          <p className="mt-3 text-xl text-slate-400 sm:text-2xl">
            {hasLimit ? `of ${(storageLimit)} TB provisioned limit` : 'Total pinned storage'}
          </p>
        </div>

        {hasLimit ? (
          <>
            <div className="mt-12 flex items-center gap-5" role="progressbar" aria-label="Filebase quota used" aria-valuemin="0" aria-valuemax="100" aria-valuenow={boundedPercentage}>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className={`block h-full rounded-full ${progressTone}`} style={{ width: `${boundedPercentage}%` }} />
              </div>
              <span className="text-xl font-semibold text-slate-500 sm:text-2xl">{formatQuotaPercent(percentage)}</span>
            </div>
            <div className={`mt-10 flex items-start gap-5 rounded-3xl border px-6 py-6 text-xl leading-relaxed sm:px-8 sm:text-2xl ${boundedPercentage >= 80 ? 'border-amber-200 bg-amber-50 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-slate-600'}`}>
              <AlertTriangle size={28} className={`mt-1 shrink-0 ${boundedPercentage >= 80 ? 'text-amber-500' : 'text-emerald-500'}`} />
              <p>{boundedPercentage >= 80 ? 'Filebase is approaching its provisioned quota threshold.' : 'Filebase storage is operating within normal parameters.'}</p>
            </div>
          </>
        ) : (
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-400">Auto-scaling IPFS pinning is active</p>
        )}
      </section>
    );
  }

  if (variant === 'horizontal') {
    const progressTone = boundedPercentage >= 85 ? 'bg-rose-500' : boundedPercentage >= 70 ? 'bg-amber-500' : healthyProgressTone;

    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-panel sm:px-6">
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(200px,0.65fr)_minmax(320px,1.55fr)]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Database size={19} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Filebase quota</h2>
              <p className="mt-0.5 text-xs text-slate-400">IPFS storage capacity</p>
            </div>
          </div>

          <div>
            <strong className="text-2xl font-bold tracking-tight text-slate-800">{formatStorageGb(storageUsed)}</strong>
            <span className="ml-2 text-sm text-slate-400">used</span>
            <p className="mt-0.5 text-xs text-slate-400">{hasLimit ? `${(storageLimit)} TB provisioned` : 'Pay-as-you-go storage'}</p>
          </div>

          <div className="flex min-w-0 items-center gap-4">
            {hasLimit ? (
              <div className="min-w-0 flex-1" role="progressbar" aria-label="Filebase quota used" aria-valuemin="0" aria-valuemax="100" aria-valuenow={boundedPercentage}>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-slate-500">Storage utilization</span>
                  <strong className="text-slate-700">{formatQuotaPercent(percentage)}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <span className={`block h-full rounded-full ${progressTone}`} style={{ width: `${boundedPercentage}%` }} />
                </div>
              </div>
            ) : <div className="min-w-0 flex-1 text-sm text-slate-500">Auto-scaling IPFS pinning is active.</div>}
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${hasLimit && boundedPercentage >= 80 ? 'bg-amber-50 text-amber-700' : healthyBadgeTone}`}>
              {hasLimit && boundedPercentage >= 80 ? 'Review quota' : 'Healthy'}
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel xl:col-span-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">Filebase quota</h2>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${hasLimit ? (percentage >= 80 ? 'bg-amber-50 text-amber-700' : healthyBadgeTone) : 'bg-indigo-50 text-indigo-700'}`}>
          {hasLimit ? `${formatQuotaPercent(percentage)} Used` : 'Pay-As-You-Go'}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col">
            <strong className="text-3xl font-bold tracking-tight text-slate-800">{formatStorageGb(storageUsed)}</strong>
            <span className="mt-1 text-sm text-slate-400">
              {hasLimit ? `of ${(storageLimit)} TB provisioned limit` : 'Total pinned storage'}
            </span>
          </div>
        </div>

        {hasLimit ? (
          <>
            <div className="mt-5 flex items-center gap-3" role="progressbar" aria-label="Filebase quota used" aria-valuemin="0" aria-valuemax="100" aria-valuenow={boundedPercentage}>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className={`block h-full rounded-full ${boundedPercentage >= 85 ? 'bg-rose-500' : boundedPercentage >= 70 ? 'bg-amber-500' : healthyProgressTone}`} style={{ width: `${boundedPercentage}%` }} />
              </div>
              <span className="text-sm font-semibold text-slate-500">{formatQuotaPercent(percentage)}</span>
            </div>

            <div className={`mt-5 flex gap-3 rounded-xl border px-4 py-3 text-sm ${boundedPercentage >= 80 ? 'border-amber-200 bg-amber-50 text-slate-600' : healthyPanelTone}`}>
              <span className={`shrink-0 ${boundedPercentage >= 80 ? 'text-amber-500' : healthyIconTone}`}>
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
