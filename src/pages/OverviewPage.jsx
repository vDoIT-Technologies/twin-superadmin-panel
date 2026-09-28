import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Cloud,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import {
  RANGE_DAYS,
  groupBy,
  selectFacts,
  sumMetric,
  timeSeries,
} from '../demo-data/superadminSelectors';
import { areaChart, stackedBar } from '../utils/chartHelpers';
import { useAuth } from '../app/AuthContext';
import { isServiceForProduct, isVendorForProduct } from '../utils/productAccess';
import {
  dashboardService,
  getStorageUsage,
  getTopClientsByCost,
  getCostRevenueSeries,
  getCostByVendorSeries,
  getVaultSummary,
  getVaultSummaryByEnv,
} from '../services';
import { firstNumber, normalizeStorageUsage } from '../utils/vaultFormatters';
import { formatCost } from '../utils/dashboardUtils';
function formatOverviewCurrency(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absolute >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absolute >= 1e3) return `$${(value / 1e3).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}
function formatTrendTooltip(value) {
  const n = Number(value) || 0;
  if (n === 0) return '$0.00';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}k`;
  return `$${n.toFixed(6)}`;
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
const VENDOR_COLORS = {
  filebase: '#0ea5e9',
  openai: '#10a37f',
  elevenlabs: '#6366f1',
  did: '#8b5cf6',
  heygen: '#a855f7',
  apify: '#f59e0b',
  s3ses: '#fb923c',
  stripe: '#635bff',
  blockchain: '#ec4899',
};

const vendorColorFor = (id) => VENDOR_COLORS[id] || '#94a3b8';
const metricConfig = [
  { key: 'cost', label: 'Total Cost', icon: Wallet, tone: 'indigo' },
  { key: 'revenue', label: 'Total Revenue', icon: TrendingUp, tone: 'emerald' },
  { key: 'margin', label: 'Margin', icon: Percent, tone: 'violet' },
  { key: 'users', label: 'Active Users', icon: Users, tone: 'amber' },
  { key: 'awsCost', label: 'AWS Cost', icon: Cloud, tone: 'sky' },
];

export function OverviewPage() {
  const { adminProduct } = useAuth();
  const { filters } = useContext(FilterContext);
  const navigate = useNavigate();
  const isVault = adminProduct === 'vault';

  const rows = useMemo(
    () => selectFacts(filters).filter((row) => isServiceForProduct(adminProduct, row.service)),
    [adminProduct, filters],
  );

  const trendChartRef = useRef(null);
  const vendorChartRef = useRef(null);
  const [topClientsByCost, setTopClientsByCost] = useState(null);
  const [topClientsStatus, setTopClientsStatus] = useState('idle');
  const [vaultSeries, setVaultSeries] = useState(null);
  const [vaultSeriesStatus, setVaultSeriesStatus] = useState('idle');
  const [vaultVendorSeries, setVaultVendorSeries] = useState(null);
  const [vaultVendorSeriesStatus, setVaultVendorSeriesStatus] = useState('idle');
  const [vaultSummary, setVaultSummary] = useState(null);
  const [vaultSummaryStatus, setVaultSummaryStatus] = useState('idle');
  const [vaultByEnv, setVaultByEnv] = useState(null);
  const [vaultByEnvStatus, setVaultByEnvStatus] = useState('idle');

  // ----Top 5 clients by cost ----
  useEffect(() => {
    // Fire for both admins — the backend branches by role.
    let active = true;
    setTopClientsStatus('loading');

    const env = filters.envs.length === 1 ? filters.envs[0] : undefined;

    getTopClientsByCost({
      env,
      limit: 5,
      clientId: filters.client || undefined,
      userId: filters.user || undefined,
      range: filters.range,
    })
      .then((list) => {
        if (!active) return;
        setTopClientsByCost(Array.isArray(list) ? list : []);
        setTopClientsStatus('ready');
      })
      .catch((error) => {
        console.error('Top clients by cost load failed:', error);
        if (active) {
          setTopClientsByCost(null);
          setTopClientsStatus('unavailable');
        }
      });

    return () => { active = false; };
  }, [filters.envs, filters.client, filters.user, filters.range]);
  // ---- Cost vs Revenue series ----

  useEffect(() => {
    let active = true;
    setVaultSeriesStatus('loading');

    const env = filters.envs.length === 1 ? filters.envs[0] : undefined;

    getCostRevenueSeries({
      env,
      clientId: filters.client || undefined,
      entityRange: filters.entityRange && filters.entityRange !== 'all'
        ? filters.entityRange
        : undefined,
    })
      .then((data) => {
        if (!active) return;
        setVaultSeries(data || null);
        setVaultSeriesStatus('ready');
      })
      .catch((error) => {
        console.error('Cost vs revenue series load failed:', error);
        if (active) {
          setVaultSeries(null);
          setVaultSeriesStatus('unavailable');
        }
      });

    return () => { active = false; };
  }, [filters.envs, filters.client, filters.entityRange]);

  // ---- Cost by vendor series ----
  useEffect(() => {
    let active = true;
    setVaultVendorSeriesStatus('loading');

    const env = filters.envs.length === 1 ? filters.envs[0] : undefined;

    getCostByVendorSeries({
      env,
      clientId: filters.client || undefined,
      entityRange: filters.entityRange && filters.entityRange !== 'all'
        ? filters.entityRange
        : undefined,
    })
      .then((data) => {
        if (!active) return;
        setVaultVendorSeries(data || null);
        setVaultVendorSeriesStatus('ready');
      })
      .catch((error) => {
        console.error('Cost by vendor series load failed:', error);
        if (active) {
          setVaultVendorSeries(null);
          setVaultVendorSeriesStatus('unavailable');
        }
      });

    return () => { active = false; };
  }, [filters.envs, filters.client, filters.entityRange]);

  // ---- Live summary KPIs (Twin + Vault) ----
  useEffect(() => {
    let active = true;
    setVaultSummaryStatus('loading');

    const env = filters.envs.length === 1 ? filters.envs[0] : undefined;

    getVaultSummary({
      env,
      clientId: filters.client || undefined,
    })
      .then((data) => {
        if (!active) return;
        setVaultSummary(data || null);
        setVaultSummaryStatus('ready');
      })
      .catch((error) => {
        console.error('Summary load failed:', error);
        if (active) {
          setVaultSummary(null);
          setVaultSummaryStatus('unavailable');
        }
      });

    return () => { active = false; };
  }, [filters.envs, filters.client]);

  // ---- Summary by env (Environment comparison card, Twin + Vault) ----
  useEffect(() => {
    let active = true;
    setVaultByEnvStatus('loading');

    getVaultSummaryByEnv({
      clientId: filters.client || undefined,
    })
      .then((data) => {
        if (!active) return;
        setVaultByEnv(Array.isArray(data) ? data : []);
        setVaultByEnvStatus('ready');
      })
      .catch((error) => {
        console.error('Summary-by-env load failed:', error);
        if (active) {
          setVaultByEnv(null);
          setVaultByEnvStatus('unavailable');
        }
      });

    return () => { active = false; };
  }, [filters.client]);
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
        (!filters.service || row.service === filters.service) &&
        isServiceForProduct(adminProduct, row.service),
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
  }, [adminProduct, filters, rows]);

  const overviewMetrics = useMemo(() => {
    const live = vaultSummary;
    if (!live) return null;

    return [
      { key: 'cost', value: formatOverviewCurrency(live.totalCost ?? 0), meta: null },
      { key: 'revenue', value: formatOverviewCurrency(live.totalRevenue ?? 0), meta: null },
      {
        key: 'margin', value: `${(live.margin ?? 0).toFixed(1)}%`,
        meta: formatOverviewCurrency(live.marginValue ?? 0)
      },
      { key: 'awsCost', value: formatOverviewCurrency(live.awsCost ?? 0), meta: null },
    ];
  }, [vaultSummary]);

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

  const totalScopedCost = useMemo(() => sumMetric(rows, 'cost', filters), [filters, rows]);

  const environmentCards = useMemo(() => {
    const live = Array.isArray(vaultByEnv) ? vaultByEnv : null;
    if (!live || !live.length) return [];

    const ENV_META = superadminDemoData.ENV_META;

    return filters.envs.map((env) => {
      const row = live.find((r) => r.env === env);
      const meta = ENV_META[env];

      return {
        env,
        label: meta?.label ?? env,
        color: meta?.color ?? '#94a3b8',
        active: true,
        cost: formatOverviewCurrency(row?.totalCost ?? 0),
        revenue: formatOverviewCurrency(row?.totalRevenue ?? 0),
      };
    });
  }, [vaultByEnv, filters.envs]);

  const vendorChartConfig = useMemo(() => {
    if (!vaultVendorSeries?.labels?.length) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: vaultVendorSeries.labels.map((label) => {
        const [year, month] = String(label).split('-');
        return year && month ? `${month}/${year.slice(2)}` : label;
      }),
      datasets: vaultVendorSeries.series
        .filter((s) => Array.isArray(s.values) && s.values.some((v) => Number(v) > 0))
        .map((s) => ({
          label: s.label,
          color: vendorColorFor(s.id),
          data: s.values,
        })),
    };
  }, [vaultVendorSeries]);

  const compareRows = useMemo(() => {
    if (!filters.compare) return [];

    const live = Array.isArray(vaultByEnv) ? vaultByEnv : [];
    const ENV_META = superadminDemoData.ENV_META;

    return filters.envs.map((env) => {
      const row = live.find((r) => r.env === env) || {};
      const cost = Number(row.totalCost) || 0;
      const revenue = Number(row.totalRevenue) || 0;
      const marginPct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
      const meta = ENV_META[env];

      return {
        env,
        label: meta?.label ?? env,
        color: meta?.color ?? '#94a3b8',
        cost: formatOverviewCurrency(cost),
        revenue: formatOverviewCurrency(revenue),
        margin: `${Math.round(marginPct)}%`,
        messages: '—',
      };
    });
  }, [filters.compare, filters.envs, vaultByEnv]);

  const trendConfig = useMemo(() => {
    if (!vaultSeries?.labels?.length) {
      return { title: 'Cost vs Revenue over time', labels: [], datasets: [], formatter: formatOverviewCurrency };
    }

    return {
      title: 'Cost vs Revenue over time',
      labels: vaultSeries.labels.map((label) => {
        const [year, month] = String(label).split('-');
        return year && month ? `${month}/${year.slice(2)}` : label;
      }),
      datasets: [
        { label: 'Revenue', color: '#10b981', data: vaultSeries.revenue },
        { label: 'Cost', color: '#ef4444', data: vaultSeries.cost },
      ],
      formatter: formatOverviewCurrency,
    };
  }, [vaultSeries]);

  useEffect(() => {
    const charts = [];

    if (trendChartRef.current) {
      charts.push(
        areaChart(
          trendChartRef.current,
          trendConfig.labels,
          trendConfig.datasets,
          {
            fmt: formatTrendTooltip,
            yfmt: trendConfig.formatter,
          },
        ),
      );
    }

    if (vendorChartRef.current && vendorChartConfig.datasets.length > 0) {
      charts.push(
        stackedBar(vendorChartRef.current, vendorChartConfig.labels, vendorChartConfig.datasets, {
          fmt: formatTrendTooltip,
          yfmt: formatOverviewCurrency,
          legend: true,
        }),
      );
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [trendConfig, vendorChartConfig]);

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ---- KPI cards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {vaultSummaryStatus === 'loading' ? (
          [0, 1, 2, 3].map((i) => (
            <article
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="mt-5 h-8 w-28 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
            </article>
          ))
        ) : vaultSummaryStatus === 'unavailable' || !overviewMetrics ? (
          <div className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
            Summary metrics are unavailable right now. Try refreshing.
          </div>
        ) : (
          overviewMetrics.map((metric) => {
            const config = metricConfig.find((item) => item.key === metric.key);
            const Icon = config.icon;
            return (
              <article
                key={metric.key}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:shadow-floating"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.tone === 'green' ? 'bg-emerald-50 text-emerald-500'
                    : config.tone === 'orange' ? 'bg-amber-50 text-amber-500'
                      : config.tone === 'red' ? 'bg-rose-50 text-rose-500'
                        : config.tone === 'sky' ? 'bg-sky-50 text-sky-500'
                          : config.tone === 'violet' ? 'bg-violet-50 text-violet-500'
                            : config.tone === 'rose' ? 'bg-rose-50 text-rose-500'
                              : 'bg-indigo-50 text-indigo-500'
                    }`}>
                    <Icon size={18} />
                  </span>
                  {metric.badge ? (
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${metric.badge.direction === 'up'
                      ? 'bg-emerald-50 text-emerald-500'
                      : 'bg-rose-50 text-rose-500'
                      }`}>
                      <span className={`overview-kpi-badge-arrow overview-kpi-badge-arrow-${metric.badge.direction}`} />
                      {metric.badge.value}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-800">{metric.value}</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {config.label}
                  {metric.meta ? <span className="text-slate-400"> · {metric.meta}</span> : null}
                </p>
              </article>
            );
          })
        )}
      </div>

      {/* ---- Trend chart ---- */}
      {/* ---- Trend chart ---- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">{trendConfig.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
              {trendConfig.datasets.map((dataset) => (
                <span key={dataset.label}>
                  <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: dataset.color }} />
                  {dataset.label}
                </span>
              ))}
            </div>
          </div>
          <div className="relative mt-5 h-72">
            <canvas ref={trendChartRef} />
          </div>
        </section>
      </div>

      {/* ---- Cost by vendor + Environment comparison ---- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Cost by vendor</h2>
          </div>
          <div className="relative mt-5 h-72">
            <canvas ref={vendorChartRef} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Environment comparison</h2>
          </div>
          {environmentCards.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No environments selected.
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {environmentCards.map((item) => (
                <article key={item.env} className={`py-4 ${item.active ? '' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      {item.label}
                    </span>
                    {!item.active ? <span className="text-xs font-medium text-slate-400">filtered out</span> : null}
                  </div>
                  <div className={`mt-3 grid gap-3 ${isVault ? 'grid-cols-2' : 'grid-cols-2'}`}>
                    <div className="flex flex-col">
                      <strong>{item.cost}</strong>
                      <span className="mt-1 text-xs text-slate-400">Cost</span>
                    </div>
                    <div className="flex flex-col">
                      <strong>{item.revenue}</strong>
                      <span className="mt-1 text-xs text-slate-400">Revenue</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---- Top 5 clients by cost ---- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-800">Top 5 Clients by cost</h2>
        </div>

        {topClientsStatus === 'loading' ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                <span className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
                <span className="h-3 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : topClientsByCost?.length ? (
          <div className="mt-4 space-y-2">
            {(() => {
              const totalCost = Math.max(
                topClientsByCost.reduce((sum, c) => sum + (Number(c.cost) || 0), 0),
                0.001,
              );
              return topClientsByCost.map((client, index) => {
                const rank = client.rank ?? index + 1;
                const share = ((Number(client.cost) || 0) / totalCost) * 100;
                const initials = (client.clientName || '?')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? '')
                  .join('');

                return (
                  <button
                    key={`${client.clientId}-${client.env}`}
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onClick={() =>
                      client.clientId &&
                      navigate(`/clients/${client.clientId}`, { state: { from: '/' } })
                    }
                    disabled={!client.clientId}
                  >
                    <span className="w-4 text-xs font-semibold text-slate-400">{rank}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-slate-700">
                          {client.clientName || 'Unknown client'}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-slate-800">
                          {formatCost(client.cost)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-emerald-400"
                          style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between gap-3 text-xs text-slate-400">
                        <span className="truncate">
                          {client.userCount != null ? `${client.userCount} users` : ''}
                        </span>
                        <span className="shrink-0 font-medium">
                          {share.toFixed(1)}% of total
                        </span>
                      </div>
                    </div>
                    <span className="text-xl text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500">
                      ›
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            No client cost data available.
          </div>
        )}
      </section>

      {/* ---- Compare row ---- */}
      {filters.compare ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {compareRows.map((item) => (
            <article key={item.env} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <h3 className="font-semibold text-slate-800">{item.label}</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col"><span className="text-slate-400">Cost</span><strong className="mt-1 text-slate-700">{item.cost}</strong></div>
                <div className="flex flex-col"><span className="text-slate-400">Revenue</span><strong className="mt-1 text-slate-700">{item.revenue}</strong></div>
                <div className="flex flex-col"><span className="text-slate-400">Margin</span><strong className="mt-1 text-slate-700">{item.margin}</strong></div>
                <div className="flex flex-col"><span className="text-slate-400">Messages</span><strong className="mt-1 text-slate-700">{item.messages}</strong></div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}