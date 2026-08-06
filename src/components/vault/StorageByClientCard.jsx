import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { envBadge, formatNumber } from '../../utils/dashboardUtils';
import { formatStorageGb, getUserInitials } from '../../utils/vaultFormatters';

function StatusBadge({ status }) {
  return <span className={`vault-client-status vault-client-status-${status}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

export function StorageByClientCard({ clients }) {
  const navigate = useNavigate();
  const maxStorage = Math.max(...clients.map((client) => client.storageGb), 1);
  return (
    <section className="table-card vault-detail-card vault-client-card vault-storage-client-card">
      <div className="vault-card-head">
        <h2>Storage by client</h2>
        <span>Click to drill</span>
      </div>
      <div className="vault-storage-client-list">
        {clients.length === 0 ? <div className="entity-empty-state">No client storage data found</div> : clients.map((client) => (
          <button
            key={client.id ? `${client.id}-${client.env}` : `${client.rank}-${client.name}-${client.env}`}
            type="button"
            className="vault-storage-client-row"
            onClick={() => client.id && navigate(
              `/clients/${client.id}?tab=vault`,
              { state: { from: '/vault' } },
            )}
            disabled={!client.id}
          >
            <span className="vault-client-rank">{client.rank}</span>
            <span className="vault-client-avatar">{getUserInitials(client.name)}</span>
            <span className="vault-storage-client-main">
              <span className="vault-storage-client-title">
                <strong title={client.name}>{client.name}</strong>
                <span className="vault-storage-client-badges">
                  <StatusBadge status={client.status} />
                  {envBadge(client.env)}
                </span>
              </span>
              <span className="vault-client-bar">
                <span className="vault-client-bar-fill" style={{ width: `${Math.max(0, Math.min(100, (client.storageGb / maxStorage) * 100))}%` }} />
              </span>
            </span>
            <span className="vault-storage-client-usage">
              <strong>{formatStorageGb(client.storageGb)}</strong>
              <span>{formatNumber(client.files)} files</span>
            </span>
            <ChevronRight className="vault-storage-client-arrow" size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
