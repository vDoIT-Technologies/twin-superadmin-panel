import { useContext, useEffect, useMemo, useRef } from 'react';
import {
  Bot,
  CircleAlert,
  CircleCheck,
  Flame,
  MessagesSquare,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { DataTable } from '../components/common/DataTable';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { groupBy, selectFacts, sumMetric, timeSeries } from '../demo-data/superadminSelectors';
import { areaChart, donut } from '../utils/chartHelpers';
import { formatCurrency, formatMetricValue } from '../utils/formatters';

function formatOverviewCurrency(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absolute >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absolute >= 1e3) return `$${(value / 1e3).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function formatOverviewMetric(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (absolute >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (absolute >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

const clientColumns = [
  { key: 'name', label: 'Client' },
  { key: 'plan', label: 'Plan' },
  { key: 'cost', label: 'Cost' },
  { key: 'status', label: 'Status' },
];

const serviceColumns = [
  { key: 'name', label: 'Service' },
  { key: 'cost', label: 'Cost' },
  { key: 'messages', label: 'Messages' },
  { key: 'status', label: 'Status' },
];

const alertIconMap = {
  red: Flame,
  amber: CircleAlert,
  emerald: CircleCheck,
};

const metricConfig = [
  { key: 'cost', label: 'Total Cost', icon: Wallet, tone: 'indigo' },
  { key: 'revenue', label: 'Total Revenue', icon: TrendingUp, tone: 'emerald' },
  { key: 'margin', label: 'Margin', icon: Percent, tone: 'violet' },
  { key: 'messages', label: 'Messages', icon: MessagesSquare, tone: 'sky' },
  { key: 'users', label: 'Active Users', icon: Users, tone: 'amber' },
  { key: 'twins', label: 'Active Twins', icon: Bot, tone: 'rose' },
];

export function OverviewPage() {
  const { filters } = useContext(FilterContext);
  const rows = useMemo(() => selectFacts(filters), [filters]);
  const pointsChartRef = useRef(null);
  const modalityChartRef = useRef(null);

  const scopeLabel = useMemo(() => {
    const separator = filters.envs.length === 2 ? ' + ' : ', ';
    const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
    return `${envLabel} · last ${filters.range}`;
  }, [filters.envs, filters.range]);

  const summary = useMemo(() => {
    const totalCost = sumMetric(rows, 'cost', filters);
    const totalRevenue = sumMetric(rows, 'revenue', filters);
    const totalMessages = sumMetric(rows, 'messages', filters);
    const pointsPurchased = sumMetric(rows, 'pointsPurchased', filters);
    const pointsSpent = sumMetric(rows, 'pointsSpent', filters);
    const marginValue = totalRevenue - totalCost;
    const marginPct = totalRevenue ? (marginValue / totalRevenue) * 100 : 0;
    const activeUsers = superadminDemoData.USERS.filter(
      (user) => (!filters.client || user.clientId === filters.client) && filters.envs.includes(user.env),
    ).length;
    const activeTwins = superadminDemoData.TWINS.filter(
      (twin) => !filters.client || twin.clientId === filters.client,
    ).length;

    return {
      totalCost,
      totalRevenue,
      totalMessages,
      pointsPurchased,
      pointsSpent,
      marginValue,
      marginPct,
      activeUsers,
      activeTwins,
      modalityValues: [
        sumMetric(rows, 'mText', filters),
        sumMetric(rows, 'mAudio', filters),
        sumMetric(rows, 'mVideo', filters),
      ],
    };
  }, [filters, rows]);

  const overviewMetrics = useMemo(
    () => [
      { key: 'cost', value: formatOverviewCurrency(summary.totalCost), meta: null },
      { key: 'revenue', value: formatOverviewCurrency(summary.totalRevenue), meta: null },
      { key: 'margin', value: `${summary.marginPct.toFixed(1)}%`, meta: formatOverviewCurrency(summary.marginValue) },
      { key: 'messages', value: formatOverviewMetric(summary.totalMessages), meta: null },
      { key: 'users', value: String(summary.activeUsers), meta: null },
      { key: 'twins', value: String(summary.activeTwins), meta: null },
    ],
    [summary],
  );

  const recentClients = useMemo(
    () =>
      groupBy(rows, 'clientId', 'cost', filters)
        .slice(0, 5)
        .map((entry) => {
          const client = superadminDemoData.byId.client(entry.id);
          return {
            id: entry.id,
            name: client?.name ?? entry.id,
            plan: client?.plan ?? 'Unknown',
            cost: formatCurrency(entry.value),
            status: entry.id === superadminDemoData.ANOMALY.clientId ? 'watch' : 'active',
          };
        }),
    [filters, rows],
  );

  const serviceHealth = useMemo(
    () =>
      superadminDemoData.SERVICES.map((service) => {
        const serviceRows = rows.filter((row) => row.service === service.id);
        const cost = sumMetric(serviceRows, 'cost', filters);
        const messages = sumMetric(serviceRows, 'messages', filters);
        return {
          id: service.id,
          name: service.name,
          cost: formatCurrency(cost),
          messages: formatMetricValue(Math.round(messages)),
          status: service.id === superadminDemoData.ANOMALY.service ? 'watch' : 'healthy',
        };
      }).filter((service) => service.cost !== formatCurrency(0)),
    [filters, rows],
  );

  const compareRows = useMemo(() => {
    if (!filters.compare) return [];
    const envs = filters.envs.length >= 2 ? filters.envs : ['dev', 'staging', 'prod'];

    return envs.map((env) => {
      const envRows = selectFacts(filters, { envs: [env] });
      const cost = sumMetric(envRows, 'cost', filters);
      const revenue = sumMetric(envRows, 'revenue', filters);
      const messages = sumMetric(envRows, 'messages', filters);
      return {
        env,
        label: superadminDemoData.ENV_META[env].label,
        cost: formatCurrency(cost),
        revenue: formatCurrency(revenue),
        margin: revenue ? `${Math.round(((revenue - cost) / revenue) * 100)}%` : '0%',
        messages: formatMetricValue(Math.round(messages)),
      };
    });
  }, [filters]);

  const pointLabels = useMemo(() => timeSeries(rows, 'pointsPurchased', filters).labels, [rows, filters]);
  const pointsPurchasedSeries = useMemo(
    () => timeSeries(rows, 'pointsPurchased', filters).values,
    [rows, filters],
  );
  const pointsSpentSeries = useMemo(
    () => timeSeries(rows, 'pointsSpent', filters).values,
    [rows, filters],
  );

  useEffect(() => {
    const charts = [];

    if (pointsChartRef.current) {
      charts.push(
        areaChart(
          pointsChartRef.current,
          pointLabels,
          [
            { label: 'Points purchased', color: '#10b981', data: pointsPurchasedSeries },
            { label: 'Points spent', color: '#f59e0b', data: pointsSpentSeries },
          ],
          { fmt: formatOverviewMetric, yfmt: formatOverviewMetric },
        ),
      );
    }

    if (modalityChartRef.current) {
      charts.push(
        donut(
          modalityChartRef.current,
          ['Text', 'Audio', 'Video'],
          summary.modalityValues,
          ['#4f46e5', '#0ea5e9', '#a855f7'],
          { fmt: formatOverviewMetric },
        ),
      );
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [pointLabels, pointsPurchasedSeries, pointsSpentSeries, summary.modalityValues]);

  return (
    <section className="page-section">
      <header className="executive-header">
        <div className="executive-header-copy">
          <h1>Executive Overview</h1>
          <p>Cross-service usage, cost, and margin across the Twin Protocol platform</p>
        </div>
        <div className="executive-scope">
          <span className="executive-scope-label">Scope</span>
          <span className="executive-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <div className="alert-strip">
        {superadminDemoData.ALERTS.map((alert) => {
          const Icon = alertIconMap[alert.sev] ?? CircleAlert;
          return (
            <article key={alert.text} className={`alert-card alert-card-${alert.sev}`}>
              <Icon size={16} className="alert-card-icon" />
              <div className="alert-card-copy">
                <h3>{alert.text}</h3>
                <p>{alert.meta}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="overview-kpi-grid">
        {overviewMetrics.map((metric) => {
          const config = metricConfig.find((item) => item.key === metric.key);
          const Icon = config.icon;
          return (
            <article key={metric.key} className="overview-kpi-card">
              <div className="overview-kpi-head">
                <span className={`overview-kpi-icon overview-kpi-icon-${config.tone}`}>
                  <Icon size={18} />
                </span>
                <span className="overview-kpi-dash">-</span>
              </div>
              <h2>{metric.value}</h2>
              <p className="overview-kpi-label">
                {config.label}
                {metric.meta ? <span className="overview-kpi-meta"> · {metric.meta}</span> : null}
              </p>
            </article>
          );
        })}
      </div>

      <div className="overview-chart-grid">
        <section className="table-card overview-chart-card overview-chart-card-wide">
          <div className="overview-chart-header">
            <h2 className="section-title">Points purchased vs spent</h2>
            <div className="overview-chart-legend">
              <span><i className="legend-dot legend-dot-green" />Points purchased</span>
              <span><i className="legend-dot legend-dot-amber" />Points spent</span>
            </div>
          </div>
          <div className="chart-wrapper overview-chart-wrapper">
            <canvas ref={pointsChartRef} />
          </div>
        </section>

        <section className="table-card overview-chart-card overview-chart-card-donut">
          <div className="overview-chart-header">
            <h2 className="section-title">Usage by modality</h2>
          </div>
          <div className="overview-donut-shell">
            <div className="chart-wrapper overview-donut-wrapper">
              <canvas ref={modalityChartRef} />
              <div className="overview-donut-center">
                <strong>{formatOverviewMetric(summary.totalMessages)}</strong>
                <span>messages</span>
              </div>
            </div>
            <div className="overview-donut-legend">
              <div className="overview-donut-row">
                <span><i className="legend-dot legend-dot-indigo" />Text</span>
                <strong>
                  {formatOverviewMetric(summary.modalityValues[0])}{' '}
                  <span className="overview-donut-share">
                    {Math.round((summary.modalityValues[0] / Math.max(summary.totalMessages, 1)) * 100)}%
                  </span>
                </strong>
              </div>
              <div className="overview-donut-row">
                <span><i className="legend-dot legend-dot-sky" />Audio</span>
                <strong>
                  {formatOverviewMetric(summary.modalityValues[1])}{' '}
                  <span className="overview-donut-share">
                    {Math.round((summary.modalityValues[1] / Math.max(summary.totalMessages, 1)) * 100)}%
                  </span>
                </strong>
              </div>
              <div className="overview-donut-row">
                <span><i className="legend-dot legend-dot-violet" />Video</span>
                <strong>
                  {formatOverviewMetric(summary.modalityValues[2])}{' '}
                  <span className="overview-donut-share">
                    {Math.round((summary.modalityValues[2] / Math.max(summary.totalMessages, 1)) * 100)}%
                  </span>
                </strong>
              </div>
            </div>
          </div>
        </section>
      </div>

      {filters.compare ? (
        <div className="compare-grid">
          {compareRows.map((item) => (
            <article key={item.env} className={`compare-card compare-card-${item.env}`}>
              <div className="compare-card-head">
                <span className="compare-dot" />
                <h3>{item.label}</h3>
              </div>
              <div className="compare-metric">
                <span>Cost</span>
                <strong>{item.cost}</strong>
              </div>
              <div className="compare-metric">
                <span>Revenue</span>
                <strong>{item.revenue}</strong>
              </div>
              <div className="compare-metric">
                <span>Margin</span>
                <strong>{item.margin}</strong>
              </div>
              <div className="compare-metric">
                <span>Messages</span>
                <strong>{item.messages}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="content-grid">
        <div>
          <h2 className="section-title">Recent clients</h2>
          <DataTable columns={clientColumns} rows={recentClients} statusKey="status" />
        </div>
        <div>
          <h2 className="section-title">Service health</h2>
          <DataTable columns={serviceColumns} rows={serviceHealth} statusKey="status" />
        </div>
      </div>
    </section>
  );
}
