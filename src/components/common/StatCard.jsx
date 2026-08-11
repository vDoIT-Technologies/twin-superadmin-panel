import { formatCurrency, formatMetricValue } from '../../utils/formatters';
import { getStatusTone } from '../../utils/status';

export function StatCard({ metric }) {
  const isCurrency = metric.label.toLowerCase().includes('revenue');
  const tone = getStatusTone(metric.tone);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-floating">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{metric.label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
      </div>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{isCurrency ? formatCurrency(metric.value) : formatMetricValue(metric.value)}</h3>
      <p className="mt-1 text-sm text-slate-500">{metric.change}</p>
    </article>
  );
}
