import { AlertTriangle } from 'lucide-react';
import { formatBytes, formatQuotaPercent } from '../../utils/vaultFormatters';

export function VaultQuotaCard({ percentage, storageUsed, storageLimit }) {
  const boundedPercentage = Math.min(100, Math.max(0, Number(percentage) || 0));
  return (
    <section className="table-card vault-detail-card vault-quota-card vault-quota-card-full">
      <div className="vault-card-head"><h2>Filebase quota</h2></div>
      <div className="vault-quota-summary">
        <div className="vault-quota-stats">
          <div><strong>{formatQuotaPercent(percentage)}</strong><span>of provisioned quota</span></div>
          <div className="vault-quota-totals"><b>{formatBytes(storageUsed)}</b><span>of {formatBytes(storageLimit)}</span></div>
        </div>
        <div className="vault-quota-progress-row" role="progressbar" aria-label="Filebase quota used" aria-valuemin="0" aria-valuemax="100" aria-valuenow={boundedPercentage}>
          <div className="vault-quota-track"><span className="vault-quota-fill vault-quota-fill-warning" style={{ width: `${boundedPercentage}%` }} /></div>
          <span>{formatQuotaPercent(percentage)}</span>
        </div>
        <div className="vault-quota-alert">
          <span className="vault-quota-alert-icon"><AlertTriangle size={15} /></span>
          <p>{percentage >= 75 ? 'Filebase is approaching its provisioned quota. Consider raising the pin quota.' : 'Filebase quota is within a safe range. No quota increase is currently required.'}</p>
        </div>
      </div>
    </section>
  );
}
