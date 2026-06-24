import { useContext, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { RANGE_DAYS, selectFacts, sumMetric, timeSeries } from '../demo-data/superadminSelectors';
import { formatCurrencyFull, formatNumber } from '../utils/dashboardUtils';

const serviceAccentMap = {
  twin: '#10b981',
  persona: '#ef4444',
  vault: '#10b981',
  sdk: '#f59e0b',
};

const vendorMetricMap = {
  openai: { key: 'tokens', suffix: 'tokens' },
  elevenlabs: { key: 'voiceChars', suffix: 'chars' },
  did: { key: 'didMin', suffix: 'min' },
  heygen: { key: 'heyMin', suffix: 'min' },
  apify: { key: 'apifyCU', suffix: 'CU' },
  filebase: { key: null, suffix: 'GB' },
  s3ses: { key: null, suffix: 'GB' },
  blockchain: { key: 'gasTx', suffix: 'tx' },
  stripe: { key: null, suffix: 'txn' },
};

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

function buildSparklinePath(values, width = 92, height = 26) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function ServicesPage() {
  const { filters } = useContext(FilterContext);
  const [sortConfig, setSortConfig] = useState({ key: 'cost', direction: 'desc' });

  const baseFilters = useMemo(
    () => ({
      ...filters,
      service: null,
      vendor: null,
    }),
    [filters],
  );

  const rows = useMemo(() => selectFacts(baseFilters), [baseFilters]);
  const totalCost = useMemo(() => sumMetric(rows, 'cost', baseFilters), [baseFilters, rows]);
  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const serviceCards = useMemo(
    () =>
      superadminDemoData.SERVICES.map((service) => {
        const serviceFilters = { ...baseFilters, service: service.id };
        const serviceRows = selectFacts(serviceFilters);
        const cost = sumMetric(serviceRows, 'cost', serviceFilters);
        const messages = sumMetric(serviceRows, 'messages', serviceFilters);
        const apiCalls = sumMetric(serviceRows, 'apiCalls', serviceFilters);
        const share = totalCost ? (cost / totalCost) * 100 : 0;
        const secondaryLabel = service.id === 'vault' ? 'API calls' : 'Messages';
        const secondaryValue = service.id === 'vault' ? formatNumber(apiCalls) : formatNumber(messages);

        return {
          id: service.id,
          name: service.name,
          stack: service.stack,
          desc: service.desc,
          color: serviceAccentMap[service.id] ?? '#4f46e5',
          cost: formatNumber(cost),
          share: share.toFixed(0),
          secondaryLabel,
          secondaryValue,
          vendors: service.vendors.map((vendorId) => superadminDemoData.byId.vendor(vendorId)?.name ?? vendorId),
        };
      }),
    [baseFilters, rows, totalCost],
  );

  const vendorRows = useMemo(
    () =>
      superadminDemoData.VENDORS.map((vendor) => {
        const cost = sumMetric(rows, 'cost', baseFilters, vendor.id);
        const metricConfig = vendorMetricMap[vendor.id] ?? { key: null, suffix: vendor.unit };
        let usageValue = 0;

        if (metricConfig.key) {
          usageValue = sumMetric(rows, metricConfig.key, baseFilters);
        } else if (vendor.id === 'filebase') {
          usageValue = cost / superadminDemoData.RATE.filebaseGB;
        } else if (vendor.id === 's3ses') {
          usageValue = cost / superadminDemoData.RATE.s3GB;
        } else if (vendor.id === 'stripe') {
          usageValue = cost / 12;
        }

        const trendValues = timeSeries(rows, null, baseFilters, vendor.id).values;

        return {
          id: vendor.id,
          name: vendor.name,
          category: vendor.cat,
          color: vendor.color,
          cost,
          usageRaw: usageValue,
          usageValue: formatNumber(usageValue),
          usageUnit: metricConfig.suffix,
          share: totalCost ? ((cost / totalCost) * 100).toFixed(1) : '0.0',
          sparkPath: buildSparklinePath(trendValues),
        };
      })
        .filter((vendor) => vendor.cost > 0)
        .sort((left, right) => right.cost - left.cost),
    [baseFilters, rows, totalCost],
  );

  const sortedVendorRows = useMemo(() => {
    const getSortValue = (vendor) => {
      switch (sortConfig.key) {
        case 'vendor':
          return vendor.name;
        case 'usage':
          return vendor.usageRaw;
        case 'cost':
          return vendor.cost;
        case 'share':
          return Number(vendor.share);
        default:
          return vendor.cost;
      }
    };

    return [...vendorRows].sort((left, right) => {
      const a = getSortValue(left);
      const b = getSortValue(right);

      if (typeof a === 'number' && typeof b === 'number') {
        return sortConfig.direction === 'asc' ? a - b : b - a;
      }

      return sortConfig.direction === 'asc'
        ? String(a).localeCompare(String(b))
        : String(b).localeCompare(String(a));
    });
  }, [sortConfig, vendorRows]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'vendor' ? 'asc' : 'desc' },
    );
  };

  return (
    <section className="page-section services-page">
      <header className="services-header">
        <div className="services-header-copy">
          <h1>Services</h1>
          <p>Browse each platform service, its vendors, usage and cost</p>
        </div>
        <div className="services-scope">
          <span className="services-scope-label">Scope</span>
          <span className="services-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <div className="services-card-grid">
        {serviceCards.map((service) => (
          <article key={service.id} className="table-card service-summary-card">
            <div className="service-summary-head">
              <div className="service-summary-title">
                <span className="service-summary-dot" style={{ backgroundColor: service.color }} />
                <div>
                  <h2>{service.name}</h2>
                  <p>{service.stack}</p>
                </div>
              </div>
              <ArrowUpRight className="service-summary-link" size={15} />
            </div>

            <p className="service-summary-desc">{service.desc}</p>

            <div className="service-summary-metrics">
              <div>
                <strong>${service.cost}</strong>
                <span>Cost · {service.share}% of total</span>
              </div>
              <div>
                <strong>{service.secondaryValue}</strong>
                <span>{service.secondaryLabel}</span>
              </div>
            </div>

            <div className="service-summary-progress">
              <div className="service-summary-progress-track">
                <span className="service-summary-progress-fill" style={{ width: `${service.share}%` }} />
              </div>
              <span>{service.share}%</span>
            </div>

            <div className="service-summary-tags">
              {service.vendors.map((vendor) => (
                <span key={vendor} className="service-tag">
                  {vendor}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="table-card services-vendor-card">
        <div className="services-vendor-head">
          <h2>Vendors / External APIs</h2>
          <span>click a row to drill</span>
        </div>

        <div className="services-vendor-table-wrap">
          <table className="services-vendor-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="table-sort-button" onClick={() => toggleSort('vendor')}>
                    <span>Vendor</span>
                    <span className={`table-sort-indicator${sortConfig.key === 'vendor' ? ' active' : ''}`}>
                      {sortConfig.key === 'vendor' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort-button" onClick={() => toggleSort('usage')}>
                    <span>Usage</span>
                    <span className={`table-sort-indicator${sortConfig.key === 'usage' ? ' active' : ''}`}>
                      {sortConfig.key === 'usage' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort-button" onClick={() => toggleSort('cost')}>
                    <span>Cost</span>
                    <span className={`table-sort-indicator${sortConfig.key === 'cost' ? ' active' : ''}`}>
                      {sortConfig.key === 'cost' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
                <th>
                  <button type="button" className="table-sort-button" onClick={() => toggleSort('share')}>
                    <span>% of COGS</span>
                    <span className={`table-sort-indicator${sortConfig.key === 'share' ? ' active' : ''}`}>
                      {sortConfig.key === 'share' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedVendorRows.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <div className="services-vendor-name">
                      <span className="services-vendor-dot" style={{ backgroundColor: vendor.color }} />
                      <div className="services-vendor-copy">
                        <strong>{vendor.name}</strong>
                        <span>{vendor.category}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="services-vendor-usage">
                      <strong>{vendor.usageValue}</strong> <span>{vendor.usageUnit}</span>
                    </span>
                  </td>
                  <td className="cell-primary">{formatCurrencyFull(vendor.cost)}</td>
                  <td className="services-vendor-share">{vendor.share}%</td>
                  <td>
                    <svg className="services-sparkline" viewBox="0 0 92 26" aria-hidden="true">
                      <path d={vendor.sparkPath} fill="none" stroke={vendor.color} strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
