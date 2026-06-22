import { formatCurrency, formatMetricValue } from '../../utils/formatters';
import { getStatusTone } from '../../utils/status';

export function StatCard({ metric }) {
  const isCurrency = metric.label.toLowerCase().includes('revenue');
  const tone = getStatusTone(metric.tone);

  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <p className="stat-label">{metric.label}</p>
        <span className={`status-dot ${tone}`} />
      </div>
      <h3>{isCurrency ? formatCurrency(metric.value) : formatMetricValue(metric.value)}</h3>
      <p className="stat-change">{metric.change}</p>
    </article>
  );
}
