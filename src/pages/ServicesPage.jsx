import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { dashboardService } from '../services';

const statusColor = {
  Configured: '#10b981',
  'Not Configured': '#f59e0b',
  Error: '#ef4444',
};

function StatusBadge({ status }) {
  const color = statusColor[status] || '#94a3b8';
  return (
    <span className="services-status-badge" style={{ color, borderColor: color }}>
      <span className="services-status-dot" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

export function ServicesPage() {
  const [services, setServices] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const data = await dashboardService.getServicesStatus();
        if (!active) return;
        setServices(data?.data || data);
      } catch (err) {
        console.error('GET /config/services-status failed:', err);
        if (active) setServices(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const serviceList = services ? Object.entries(services).map(([name, info]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    key: name,
    status: info?.status || 'Unknown',
    data: info?.data || null,
    message: info?.message || null,
  })) : [];

  return (
    <section className="page-section services-page">
      <header className="services-header">
        <div className="services-header-copy">
          <h1>Services</h1>
          <p>Third-party integration health and status</p>
        </div>
      </header>

      <section className="table-card">
        {isLoading ? (
          <div className="table-empty users-table-loading-cell">
            <span className="users-table-loader" aria-hidden="true" />
            Checking service status...
          </div>
        ) : serviceList.length === 0 ? (
          <div className="table-empty">No services configured</div>
        ) : (
          <div className="services-grid">
            {serviceList.map((service) => (
              <article key={service.key} className="table-card services-card">
                <div className="services-card-head">
                  <h3>{service.name}</h3>
                  <StatusBadge status={service.status} />
                </div>
                {service.message ? (
                  <p className="services-card-error">{service.message}</p>
                ) : null}
                {service.data ? (
                  <div className="services-card-details">
                    {Object.entries(service.data).slice(0, 4).map(([k, v]) => (
                      <div key={k} className="services-card-detail-row">
                        <span>{k}</span>
                        <strong>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
