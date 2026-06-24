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
import { useNavigate } from 'react-router-dom';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { RANGE_DAYS, groupBy, selectFacts, sumMetric, timeSeries, twinShare } from '../demo-data/superadminSelectors';
import { areaChart, donut, stackedBar } from '../utils/chartHelpers';

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

function formatDeltaMetric(key, value) {
  if (key === 'cost' || key === 'revenue') {
    return formatOverviewCurrency(value);
  }

  return formatOverviewMetric(value);
}

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
  const navigate = useNavigate();
  const rows = useMemo(() => selectFacts(filters), [filters]);
  const trendChartRef = useRef(null);
  const modalityChartRef = useRef(null);
  const vendorChartRef = useRef(null);

  const scopeLabel = useMemo(() => {
    if (filters.envs.length === superadminDemoData.ENVS.length) {
      return `All envs · last ${filters.range}`;
    }
    const separator = filters.envs.length > 1 ? ' + ' : ', ';
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

  const metricBadgeMap = useMemo(() => {
    const days = RANGE_DAYS[filters.range];
    const currentMinDay = superadminDemoData.DAYS - days;
    const previousMinDay = Math.max(0, currentMinDay - days);

    const previousRows = superadminDemoData.facts.filter(
      (row) =>
        filters.envs.includes(row.env) &&
        row.day >= previousMinDay &&
        row.day < currentMinDay &&
        (!filters.client || row.clientId === filters.client) &&
        (!filters.service || row.service === filters.service),
    );

    return ['cost', 'revenue', 'messages'].reduce((acc, key) => {
      const currentValue = sumMetric(rows, key, filters);
      const previousValue = sumMetric(previousRows, key, filters);
      const delta = currentValue - previousValue;

      acc[key] = {
        direction: delta >= 0 ? 'up' : 'down',
        value: `${delta >= 0 ? '' : '-'}${formatDeltaMetric(key, Math.abs(delta))}`,
      };

      return acc;
    }, {});
  }, [filters, rows]);

  const overviewMetrics = useMemo(
    () => [
      { key: 'cost', value: formatOverviewCurrency(summary.totalCost), meta: null, badge: metricBadgeMap.cost },
      { key: 'revenue', value: formatOverviewCurrency(summary.totalRevenue), meta: null, badge: metricBadgeMap.revenue },
      { key: 'margin', value: `${summary.marginPct.toFixed(1)}%`, meta: formatOverviewCurrency(summary.marginValue) },
      { key: 'messages', value: formatOverviewMetric(summary.totalMessages), meta: null, badge: metricBadgeMap.messages },
      { key: 'users', value: String(summary.activeUsers), meta: null },
      { key: 'twins', value: String(summary.activeTwins), meta: null },
    ],
    [metricBadgeMap, summary],
  );

  const topClients = useMemo(
    () =>
      groupBy(rows, 'clientId', 'cost', filters)
        .slice(0, 5)
        .map((entry) => {
          const client = superadminDemoData.byId.client(entry.id);
          return {
            id: entry.id,
            name: client?.name ?? entry.id,
            meta: client?.plan ?? 'Unknown',
            value: entry.value,
          };
        }),
    [filters, rows],
  );

  const topTwins = useMemo(() => {
    const costByClient = rows.reduce((acc, row) => {
      acc[row.clientId] = (acc[row.clientId] || 0) + row.cost;
      return acc;
    }, {});

    return superadminDemoData.TWINS.filter((twin) => !filters.client || twin.clientId === filters.client)
      .map((twin) => ({
        id: twin.id,
        name: twin.name,
        meta: superadminDemoData.byId.client(twin.clientId)?.name ?? '',
        value: (costByClient[twin.clientId] || 0) * twinShare(twin),
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [filters.client, rows]);

  const totalScopedCost = useMemo(() => sumMetric(rows, 'cost', filters), [filters, rows]);

  const environmentCards = useMemo(
    () =>
      superadminDemoData.ENVS.map((env) => {
        const envRows = selectFacts(filters, { envs: [env] });
        const cost = sumMetric(envRows, 'cost', filters);
        const revenue = sumMetric(envRows, 'revenue', filters);
        const messages = sumMetric(envRows, 'messages', filters);
        return {
          env,
          label: superadminDemoData.ENV_META[env].label,
          color: superadminDemoData.ENV_META[env].color,
          active: filters.envs.includes(env),
          cost: formatOverviewCurrency(cost),
          revenue: formatOverviewCurrency(revenue),
          messages: formatOverviewMetric(messages),
        };
      }),
    [filters, rows],
  );

  const vendorChartConfig = useMemo(() => {
    const labels = timeSeries(rows, 'cost', filters).labels;
    const datasets = superadminDemoData.VENDORS.filter((vendor) =>
      rows.some((row) => (row.vendorCost[vendor.id] || 0) > 0),
    ).map((vendor) => ({
      label: vendor.name,
      color: vendor.color,
      data: timeSeries(rows, null, filters, vendor.id).values,
    }));

    return {
      labels,
      datasets,
    };
  }, [filters, rows]);

  const compareRows = useMemo(() => {
    if (!filters.compare) return [];
    return filters.envs.map((env) => {
      const envRows = selectFacts(filters, { envs: [env] });
      return {
        env,
        label: superadminDemoData.ENV_META[env].label,
        cost: formatOverviewCurrency(sumMetric(envRows, 'cost', filters)),
        revenue: formatOverviewCurrency(sumMetric(envRows, 'revenue', filters)),
        margin: `${Math.round(((sumMetric(envRows, 'revenue', filters) - sumMetric(envRows, 'cost', filters)) / Math.max(sumMetric(envRows, 'revenue', filters), 1)) * 100)}%`,
        messages: formatOverviewMetric(sumMetric(envRows, 'messages', filters)),
      };
    });
  }, [filters]);

  const trendConfig = useMemo(() => {
    if (filters.lens === 'usage') {
      return {
        title: 'Message volume over time',
        labels: timeSeries(rows, 'messages', filters).labels,
        datasets: [
          { label: 'Messages', color: '#4f46e5', data: timeSeries(rows, 'messages', filters).values },
          { label: 'API calls', color: '#0ea5e9', data: timeSeries(rows, 'apiCalls', filters).values },
        ],
        formatter: formatOverviewMetric,
      };
    }

    if (filters.lens === 'economy') {
      return {
        title: 'Points purchased vs spent',
        labels: timeSeries(rows, 'pointsPurchased', filters).labels,
        datasets: [
          { label: 'Points purchased', color: '#10b981', data: timeSeries(rows, 'pointsPurchased', filters).values },
          { label: 'Points spent', color: '#f59e0b', data: timeSeries(rows, 'pointsSpent', filters).values },
        ],
        formatter: formatOverviewMetric,
      };
    }

    return {
      title: 'Cost vs Revenue over time',
      labels: timeSeries(rows, 'cost', filters).labels,
      datasets: [
        { label: 'Revenue', color: '#10b981', data: timeSeries(rows, 'revenue', filters).values },
        { label: 'Cost', color: '#ef4444', data: timeSeries(rows, 'cost', filters).values },
      ],
      formatter: formatOverviewCurrency,
    };
  }, [filters, rows]);

  useEffect(() => {
    const charts = [];

    if (trendChartRef.current) {
      charts.push(
        areaChart(
          trendChartRef.current,
          trendConfig.labels,
          trendConfig.datasets,
          { fmt: trendConfig.formatter, yfmt: trendConfig.formatter },
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

    if (vendorChartRef.current && vendorChartConfig.datasets.length > 0) {
      charts.push(
        stackedBar(vendorChartRef.current, vendorChartConfig.labels, vendorChartConfig.datasets, {
          fmt: formatOverviewCurrency,
          yfmt: formatOverviewCurrency,
          legend: true,
        }),
      );
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [summary.modalityValues, trendConfig, vendorChartConfig]);

  const renderRankList = (items, type) => {
    const max = Math.max(...items.map((item) => item.value), 1);

    return (
      <div className={`overview-rank-list overview-rank-list-${type}`}>
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`overview-rank-row overview-rank-row-${type}`}
            onClick={() => navigate(type === 'client' ? '/clients' : '/twins')}
          >
            <span className="overview-rank-index">{index + 1}</span>
            <div className="overview-rank-avatar">{item.name.slice(0, 2).toUpperCase()}</div>
            <div className="overview-rank-main">
              <div className="overview-rank-head">
                <span className="overview-rank-name">{item.name}</span>
                <span className="overview-rank-value">{formatOverviewCurrency(item.value)}</span>
              </div>
              <div className="overview-rank-bar">
                <span className="overview-rank-bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
              <div className="overview-rank-meta">
                <span>{item.meta}</span>
                <span>{((item.value / Math.max(totalScopedCost, 1)) * 100).toFixed(1)}% of total</span>
              </div>
            </div>
            <span className="overview-rank-arrow">›</span>
          </button>
        ))}
      </div>
    );
  };

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
                {metric.badge ? (
                  <span className={`overview-kpi-badge overview-kpi-badge-${metric.badge.direction}`}>
                    <span className={`overview-kpi-badge-arrow overview-kpi-badge-arrow-${metric.badge.direction}`} />
                    {metric.badge.value}
                  </span>
                ) : null}
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
            <h2 className="section-title">{trendConfig.title}</h2>
            <div className="overview-chart-legend">
              {trendConfig.datasets.map((dataset) => (
                <span key={dataset.label}>
                  <i className="legend-dot" style={{ background: dataset.color }} />
                  {dataset.label}
                </span>
              ))}
            </div>
          </div>
          <div className="chart-wrapper overview-chart-wrapper">
            <canvas ref={trendChartRef} />
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

      <div className="overview-lower-grid">
        <section className="table-card overview-chart-card overview-vendor-card">
          <div className="overview-chart-header">
            <h2 className="section-title">Cost by vendor</h2>
            <div className="overview-card-kicker">stacked, per {filters.gran}</div>
          </div>
          <div className="chart-wrapper overview-vendor-wrapper">
            <canvas ref={vendorChartRef} />
          </div>
        </section>

        <section className="table-card overview-env-card">
          <div className="overview-chart-header">
            <h2 className="section-title">Environment comparison</h2>
          </div>
          <div className="overview-env-list">
            {environmentCards.map((item) => (
              <article key={item.env} className={`overview-env-item${item.active ? '' : ' is-muted'}`}>
                <div className="overview-env-head">
                  <span className="overview-env-label">
                    <i className="legend-dot" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  {!item.active ? <span className="overview-env-muted">filtered out</span> : null}
                </div>
                <div className="overview-env-metrics">
                  <div>
                    <strong>{item.cost}</strong>
                    <span>Cost</span>
                  </div>
                  <div>
                    <strong>{item.revenue}</strong>
                    <span>Revenue</span>
                  </div>
                  <div>
                    <strong>{item.messages}</strong>
                    <span>Messages</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="overview-rank-grid">
        <section className="table-card overview-rank-card overview-rank-card-client">
          <div className="overview-chart-header">
            <h2 className="section-title">Top 5 Clients by cost</h2>
            <div className="overview-card-kicker">click to drill</div>
          </div>
          {renderRankList(topClients, 'client')}
        </section>

        <section className="table-card overview-rank-card overview-rank-card-twin">
          <div className="overview-chart-header">
            <h2 className="section-title">Top 5 Twins by cost</h2>
            <div className="overview-card-kicker">click to drill</div>
          </div>
          {renderRankList(topTwins, 'twin')}
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
    </section>
  );
}
