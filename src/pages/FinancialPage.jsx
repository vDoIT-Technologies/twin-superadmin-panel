import { useContext, useEffect, useMemo, useRef } from 'react';
import {
  CalendarClock,
  CircleUserRound,
  Download,
  MessageSquareMore,
  Percent,
  SquareDashedMousePointer,
  TrendingUp,
  Wallet2,
} from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { groupBy, selectFacts, timeSeries } from '../demo-data/superadminSelectors';
import { areaChart, stackedBar } from '../utils/chartHelpers';
import { deltaPercent, formatCurrencyFull, formatPercent } from '../utils/dashboardUtils.jsx';

const vendorOrder = ['openai', 'elevenlabs', 'did', 'heygen', 'apify', 'filebase', 's3ses', 'blockchain', 'stripe'];
const waterfallVendorOrder = ['openai', 'did', 's3ses', 'apify', 'elevenlabs', 'filebase', 'heygen', 'stripe', 'blockchain'];

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

function formatAxisCurrency(value) {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${(value / 1e3).toFixed(1)}k`;
}

function ceilToStep(value, step) {
  return Math.ceil(value / step) * step;
}

export function FinancialPage() {
  const { filters } = useContext(FilterContext);
  const vendorChartRef = useRef(null);
  const pointsChartRef = useRef(null);

  const scopedFilters = useMemo(
    () => ({
      ...filters,
      service: null,
      vendor: null,
      twin: null,
      user: null,
    }),
    [filters],
  );

  const rows = useMemo(() => selectFacts(scopedFilters), [scopedFilters]);
  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);

  const summary = useMemo(() => {
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const totalSessions = rows.reduce((sum, row) => sum + row.sessions, 0);
    const totalMessages = rows.reduce((sum, row) => sum + row.messages, 0);
    const pointsPurchased = rows.reduce((sum, row) => sum + row.pointsPurchased, 0);
    const pointsSpent = rows.reduce((sum, row) => sum + row.pointsSpent, 0);
    const marginValue = totalRevenue - totalCost;
    const marginPct = totalRevenue ? (marginValue / totalRevenue) * 100 : 0;

    return {
      totalCost,
      projectedCost: totalCost,
      totalRevenue,
      marginValue,
      marginPct,
      totalSessions,
      totalMessages,
      pointsPurchased,
      pointsSpent,
    };
  }, [rows]);

  const costDelta = useMemo(() => deltaPercent(scopedFilters, 'cost'), [scopedFilters]);

  const vendorTimeData = useMemo(() => {
    const labels = timeSeries(rows, 'cost', scopedFilters).labels;
    const datasets = vendorOrder
      .map((vendorId) => {
        const vendor = superadminDemoData.byId.vendor(vendorId);
        const values = timeSeries(rows, 'cost', scopedFilters, vendorId).values;
        const total = values.reduce((sum, value) => sum + value, 0);

        if (!vendor || total <= 0) return null;

        return {
          label: vendor.name,
          color: vendor.color,
          data: values,
        };
      })
      .filter(Boolean);

    return { labels, datasets };
  }, [rows, scopedFilters]);

  const budgetRows = useMemo(
    () =>
      superadminDemoData.SERVICES.map((service) => {
        const serviceRows = rows.filter((row) => row.service === service.id);
        const actual = serviceRows.reduce((sum, row) => sum + row.cost, 0);
        const budget = superadminDemoData.BUDGETS[service.id] ?? 0;
        const variancePct = budget ? (actual / budget) * 100 : 0;

        return {
          id: service.id,
          name: service.name,
          actual,
          budget,
          variancePct,
        };
      }),
    [rows],
  );

  const pointsEconomySeries = useMemo(() => {
    const purchased = timeSeries(rows, 'pointsPurchased', scopedFilters);
    const spent = timeSeries(rows, 'pointsSpent', scopedFilters);

    return {
      labels: purchased.labels,
      purchased: purchased.values,
      spent: spent.values,
      yMax: ceilToStep(Math.max(...purchased.values, ...spent.values, 1), 2000000),
    };
  }, [rows, scopedFilters]);

  const economySummaryRows = useMemo(
    () => [
      { label: 'Points purchased', value: `${(summary.pointsPurchased / 1e6).toFixed(2)}M`, tone: 'emerald' },
      { label: 'Points spent', value: `${(summary.pointsSpent / 1e6).toFixed(2)}M`, tone: 'amber' },
      {
        label: 'Unspent (liability)',
        value: `${((summary.pointsPurchased - summary.pointsSpent) / 1e6).toFixed(2)}M`,
        tone: 'slate',
      },
      { label: 'Revenue (USD)', value: formatCurrencyFull(summary.totalRevenue), tone: 'slate' },
      { label: 'COGS (USD)', value: formatCurrencyFull(summary.totalCost), tone: 'slate' },
      {
        label: 'Net margin',
        value: `${formatCurrencyFull(summary.marginValue)} · ${formatPercent(summary.marginPct, 1)}`,
        tone: 'violet',
      },
    ],
    [summary],
  );

  const vendorBreakdownRows = useMemo(
    () =>
      vendorOrder
        .map((vendorId) => {
          const vendor = superadminDemoData.byId.vendor(vendorId);
          const cost = rows.reduce((sum, row) => sum + (row.vendorCost[vendorId] || 0), 0);
          if (!vendor || cost <= 0) return null;
          const share = summary.totalCost ? (cost / summary.totalCost) * 100 : 0;
          return {
            id: vendor.id,
            name: vendor.name,
            category: vendor.cat,
            color: vendor.color,
            cost,
            share,
          };
        })
        .filter(Boolean)
        .sort((left, right) => right.cost - left.cost),
    [rows, summary.totalCost],
  );

  const exportVendorCsv = () => {
    const header = ['Vendor', 'Category', 'Cost', '% of COGS'];
    const lines = vendorBreakdownRows.map((vendor) =>
      [vendor.name, vendor.category, formatCurrencyFull(vendor.cost), `${vendor.share.toFixed(1)}%`]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vendor-cost-breakdown.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const unitEconomics = useMemo(() => {
    const costPerMessage = summary.totalMessages ? summary.totalCost / summary.totalMessages : 0;
    const costPer1kTokens = rows.reduce((sum, row) => sum + row.tokens, 0)
      ? (summary.totalCost / rows.reduce((sum, row) => sum + row.tokens, 0)) * 1000
      : 0;
    const activeUsers = new Set(
      superadminDemoData.USERS.filter((user) => filters.envs.includes(user.env) && (!filters.client || user.clientId === filters.client)).map(
        (user) => user.id,
      ),
    ).size;
    const costPerActiveUser = activeUsers ? summary.totalCost / activeUsers : 0;
    const revenueToCost = summary.totalCost ? summary.totalRevenue / summary.totalCost : 0;

    return [
      { label: 'Cost / message', value: `$${costPerMessage.toFixed(4)}`, icon: MessageSquareMore },
      { label: 'Cost / 1k tokens', value: `$${costPer1kTokens.toFixed(4)}`, icon: SquareDashedMousePointer },
      { label: 'Cost / active user', value: `$${costPerActiveUser.toFixed(2)}`, icon: CircleUserRound },
      { label: 'Revenue / $ cost', value: `${revenueToCost.toFixed(2)}x`, icon: TrendingUp },
    ];
  }, [filters.client, filters.envs, rows, summary]);

  const waterfall = useMemo(() => {
    const vendorCosts = waterfallVendorOrder
      .map((vendorId) => {
        const vendor = superadminDemoData.byId.vendor(vendorId);
        const value = rows.reduce((sum, row) => sum + (row.vendorCost[vendorId] || 0), 0);
        return value > 0 ? { id: vendorId, label: vendor?.name ?? vendorId, value, color: vendor?.color ?? '#94a3b8' } : null;
      })
      .filter(Boolean);

    const steps = [{ id: 'revenue', label: 'Revenue', value: summary.totalRevenue, color: '#17a97b', type: 'total' }];
    let running = summary.totalRevenue;

    vendorCosts.forEach((vendor) => {
      const start = running - vendor.value;
      steps.push({
        id: vendor.id,
        label: vendor.label,
        value: vendor.value,
        color: vendor.color,
        type: 'delta',
        start,
        end: running,
      });
      running = start;
    });

    steps.push({
      id: 'margin',
      label: 'Margin',
      value: summary.marginValue,
      color: '#7c3aed',
      type: 'total',
    });

    const yMax = ceilToStep(Math.max(summary.totalRevenue, summary.marginValue, 1), 500000);
    const ticks = Array.from({ length: 4 }, (_, index) => yMax - index * (yMax / 3));
    return { steps, yMax, ticks };
  }, [rows, summary.marginValue, summary.totalRevenue]);

  useEffect(() => {
    const charts = [];

    if (vendorChartRef.current) {
      charts.push(
        stackedBar(vendorChartRef.current, vendorTimeData.labels, vendorTimeData.datasets, {
          legend: true,
          fmt: (value) => formatCurrencyFull(value),
          yfmt: (value) => formatAxisCurrency(value),
        }),
      );
    }

    if (pointsChartRef.current) {
      charts.push(
        areaChart(
          pointsChartRef.current,
          pointsEconomySeries.labels,
          [
            { label: 'Purchased', color: '#10b981', data: pointsEconomySeries.purchased },
            { label: 'Spent', color: '#f59e0b', data: pointsEconomySeries.spent },
          ],
          {
            fmt: (value) => `${(value / 1e6).toFixed(2)}M`,
            yfmt: (value) => (value === 0 ? '0' : `${(value / 1e6).toFixed(2)}M`),
          },
        ),
      );
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [pointsEconomySeries, vendorTimeData]);

  return (
    <section className="page-section cost-page">
      <header className="cost-header">
        <div className="cost-header-copy">
          <h1>Cost &amp; Billing</h1>
          <p>Vendor cost breakdown, budgets, unit economics and the points economy</p>
        </div>
        <div className="cost-scope">
          <span className="cost-scope-label">Scope</span>
          <span className="cost-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <div className="cost-metric-grid">
        <article className="table-card cost-metric-card">
          <div className="cost-metric-top">
            <span className="cost-metric-icon cost-metric-icon-indigo">
              <Wallet2 size={18} />
            </span>
            {costDelta != null ? <span className="cost-metric-delta">^ {Math.abs(costDelta).toFixed(1)}%</span> : null}
          </div>
          <h2>{formatCurrencyFull(summary.totalCost)}</h2>
          <p>Total COGS</p>
        </article>

        <article className="table-card cost-metric-card">
          <div className="cost-metric-top">
            <span className="cost-metric-icon cost-metric-icon-amber">
              <CalendarClock size={18} />
            </span>
          </div>
          <h2>{formatCurrencyFull(summary.projectedCost)}</h2>
          <p>
            Projected month-end <span>· run-rate</span>
          </p>
        </article>

        <article className="table-card cost-metric-card">
          <div className="cost-metric-top">
            <span className="cost-metric-icon cost-metric-icon-emerald">
              <TrendingUp size={18} />
            </span>
          </div>
          <h2>{formatCurrencyFull(summary.totalRevenue)}</h2>
          <p>Revenue</p>
        </article>

        <article className="table-card cost-metric-card">
          <div className="cost-metric-top">
            <span className="cost-metric-icon cost-metric-icon-violet">
              <Percent size={18} />
            </span>
          </div>
          <h2>{formatCurrencyFull(summary.marginValue)}</h2>
          <p>
            Margin <span>· {formatPercent(summary.marginPct, 1)}</span>
          </p>
        </article>
      </div>

      <div className="cost-chart-grid">
        <section className="table-card cost-chart-card cost-vendor-card">
          <div className="cost-card-head">
            <h2>Cost by vendor over time</h2>
            <span>stacked, per day</span>
          </div>
          <div className="chart-wrapper cost-vendor-wrapper">
            <canvas ref={vendorChartRef} />
          </div>
        </section>

        <section className="table-card cost-chart-card cost-waterfall-card">
          <div className="cost-card-head">
            <h2>Margin waterfall</h2>
            <span>revenue → COGS</span>
          </div>
          <div className="cost-waterfall">
            <div className="cost-waterfall-yaxis">
              {waterfall.ticks.map((value) => (
                <span key={value}>{formatAxisCurrency(value)}</span>
              ))}
            </div>
            <div className="cost-waterfall-plot">
              <div className="cost-waterfall-grid">
                {[0, 1, 2, 3].map((line) => (
                  <span key={line} className="cost-waterfall-grid-line" />
                ))}
              </div>
              <div className="cost-waterfall-bars">
                {waterfall.steps.map((step) => {
                  const start = step.type === 'total' ? 0 : step.start;
                  const end = step.type === 'total' ? step.value : step.end;
                  const bottom = (Math.min(start, end) / waterfall.yMax) * 100;
                  const height = (Math.abs(end - start) / waterfall.yMax) * 100;

                  return (
                    <div key={step.id} className="cost-waterfall-bar-group">
                      <div className="cost-waterfall-bar-lane">
                        <span
                          className={`cost-waterfall-bar${step.type === 'total' ? ' total' : ''}`}
                          style={{
                            backgroundColor: step.color,
                            bottom: `${bottom}%`,
                            height: `${Math.max(height, 1.5)}%`,
                          }}
                        />
                      </div>
                      <span className="cost-waterfall-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="cost-lower-grid">
        <section className="table-card cost-detail-card">
          <div className="cost-card-head">
            <h2>Budget vs actual</h2>
            <span>monthly run-rate per service</span>
          </div>
          <div className="cost-budget-list">
            {budgetRows.map((row) => (
              <div key={row.id} className="cost-budget-row">
                <div className="cost-budget-copy">
                  <strong>{row.name}</strong>
                  <span className="cost-budget-values">
                    <b>{formatCurrencyFull(row.actual)}</b> / {formatCurrencyFull(row.budget)}
                  </span>
                </div>
                <div className="cost-budget-progress">
                  <div className="cost-budget-track">
                    <span className="cost-budget-fill" style={{ width: `${Math.min(row.variancePct, 100)}%` }} />
                  </div>
                  <b>{Math.round(row.variancePct)}%</b>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="table-card cost-detail-card">
          <div className="cost-card-head">
            <h2>Unit economics</h2>
            <span>blended across selected scope</span>
          </div>
          <div className="cost-unit-grid">
            {unitEconomics.map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.label} className="cost-unit-item">
                <span className="cost-unit-icon">
                  <Icon size={16} />
                </span>
                <div className="cost-unit-copy">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="cost-economy-grid">
        <section className="table-card cost-detail-card">
          <div className="cost-card-head">
            <h2>Points economy</h2>
            <span>purchased vs spent</span>
          </div>
          <div className="chart-wrapper cost-points-wrapper">
            <canvas ref={pointsChartRef} />
          </div>
        </section>

        <section className="table-card cost-detail-card cost-summary-card">
          <div className="cost-card-head">
            <h2>Economy summary</h2>
          </div>
          <div className="cost-summary-list">
            {economySummaryRows.map((row) => (
              <div key={row.label} className="cost-summary-row">
                <span>{row.label}</span>
                <strong className={`cost-summary-value cost-summary-value-${row.tone}`}>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="table-card cost-breakdown-card">
        <div className="cost-card-head">
          <h2>Vendor cost breakdown</h2>
          <button type="button" className="cost-export-button" onClick={exportVendorCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
        <div className="cost-breakdown-table-wrap">
          <table className="cost-breakdown-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Cost</th>
                <th>% of COGS</th>
              </tr>
            </thead>
            <tbody>
              {vendorBreakdownRows.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <div className="cost-breakdown-vendor">
                      <span className="cost-breakdown-dot" style={{ backgroundColor: vendor.color }} />
                      <strong>{vendor.name}</strong>
                    </div>
                  </td>
                  <td>{vendor.category}</td>
                  <td className="cell-primary">{formatCurrencyFull(vendor.cost)}</td>
                  <td>{vendor.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
