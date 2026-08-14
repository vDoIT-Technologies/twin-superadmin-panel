import { useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { useAuth } from '../app/AuthContext';
import { isServiceForProduct, isVendorForProduct } from '../utils/productAccess';
import { VaultQuotaCard } from '../components/vault/VaultQuotaCard';
import { dashboardService, getStorageUsage } from '../services';
import { firstNumber, normalizeStorageUsage } from '../utils/vaultFormatters';

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
  const { adminProduct } = useAuth();
  const { filters } = useContext(FilterContext);
  const navigate = useNavigate();
  const rows = useMemo(
    () => selectFacts(filters).filter((row) => isServiceForProduct(adminProduct, row.service)),
    [adminProduct, filters],
  );
  const trendChartRef = useRef(null);
  const modalityChartRef = useRef(null);
  const vendorChartRef = useRef(null);
  const [filebaseQuota, setFilebaseQuota] = useState(null);
  const [filebaseQuotaStatus, setFilebaseQuotaStatus] = useState('loading');

  useEffect(() => {
    if (adminProduct !== 'twin') return undefined;

    let active = true;
    setFilebaseQuotaStatus('loading');
    const env = filters.envs.length === 1 ? filters.envs[0] : undefined;
    const params = {
      env,
      clientId: filters.client || undefined,
      range: filters.range,
      granularity: filters.gran,
    };

    Promise.allSettled([
      getStorageUsage(params),
      dashboardService.getEntityVaultStats(params),
    ])
      .then(([quotaResult, statsResult]) => {
        const quota = quotaResult.status === 'fulfilled'
          ? normalizeStorageUsage(quotaResult.value)
          : {};
        const statsPayload = statsResult.status === 'fulfilled'
          ? (statsResult.value?.data || statsResult.value)
          : {};
        const kpis = statsPayload?.kpis || {};
        const totalUsage = quota.totalUsage ?? firstNumber(kpis.storedOnIpfsBytes);
        const totalQuota = quota.totalQuota ?? firstNumber(kpis.storageLimitBytes);
        const usagePercent = quota.usagePercent
          ?? firstNumber(kpis.quotaPercent)
          ?? (totalQuota > 0 && totalUsage != null ? (totalUsage / totalQuota) * 100 : null);
        const actualQuota = { totalUsage, totalQuota, usagePercent };

        if (active) {
          setFilebaseQuota(totalQuota > 0 ? actualQuota : null);
          setFilebaseQuotaStatus(totalQuota > 0 ? 'ready' : 'unavailable');
        }
      })
      .catch((error) => {
        console.error('Filebase quota load failed:', error);
        if (active) {
          setFilebaseQuota(null);
          setFilebaseQuotaStatus('unavailable');
        }
      });

    return () => { active = false; };
  }, [adminProduct, filters.client, filters.envs, filters.gran, filters.range]);

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

  const overviewMetrics = useMemo(
    () => [
      { key: 'cost', value: formatOverviewCurrency(summary.totalCost), meta: null, badge: metricBadgeMap.cost },
      { key: 'revenue', value: formatOverviewCurrency(summary.totalRevenue), meta: null, badge: metricBadgeMap.revenue },
      { key: 'margin', value: `${summary.marginPct.toFixed(1)}%`, meta: formatOverviewCurrency(summary.marginValue) },
      { key: 'messages', value: formatOverviewMetric(summary.totalMessages), meta: null, badge: metricBadgeMap.messages },
      { key: 'users', value: String(summary.activeUsers), meta: null },
      ...(adminProduct === 'vault' ? [] : [{ key: 'twins', value: String(summary.activeTwins), meta: null }]),
    ],
    [adminProduct, metricBadgeMap, summary],
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
        const envRows = selectFacts(filters, { envs: [env] }).filter((row) => isServiceForProduct(adminProduct, row.service));
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
    [adminProduct, filters, rows],
  );

  const vendorChartConfig = useMemo(() => {
    const labels = timeSeries(rows, 'cost', filters).labels;
    const datasets = superadminDemoData.VENDORS.filter((vendor) =>
      isVendorForProduct(adminProduct, vendor.id) &&
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
  }, [adminProduct, filters, rows]);

  const compareRows = useMemo(() => {
    if (!filters.compare) return [];
    return filters.envs.map((env) => {
      const envRows = selectFacts(filters, { envs: [env] }).filter((row) => isServiceForProduct(adminProduct, row.service));
      return {
        env,
        label: superadminDemoData.ENV_META[env].label,
        cost: formatOverviewCurrency(sumMetric(envRows, 'cost', filters)),
        revenue: formatOverviewCurrency(sumMetric(envRows, 'revenue', filters)),
        margin: `${Math.round(((sumMetric(envRows, 'revenue', filters) - sumMetric(envRows, 'cost', filters)) / Math.max(sumMetric(envRows, 'revenue', filters), 1)) * 100)}%`,
        messages: formatOverviewMetric(sumMetric(envRows, 'messages', filters)),
      };
    });
  }, [adminProduct, filters]);

  const productAlerts = useMemo(
    () => superadminDemoData.ALERTS.filter((alert) => {
      const isVaultAlert = /vault|filebase|ipfs/i.test(`${alert.text} ${alert.meta || ''}`);
      return adminProduct === 'vault' ? isVaultAlert : !isVaultAlert;
    }),
    [adminProduct],
  );

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
      <div className="space-y-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => navigate(type === 'client' ? '/clients' : '/twins')}
          >
            <span className="w-4 text-xs font-semibold text-slate-400">{index + 1}</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">{item.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-slate-700">{item.name}</span>
                <span className="shrink-0 text-sm font-bold text-slate-800">{formatOverviewCurrency(item.value)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-sky-400" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
              <div className="mt-1 flex justify-between gap-3 text-xs text-slate-400">
                <span className="truncate">{item.meta}</span>
                <span className="shrink-0 font-medium">{((item.value / Math.max(totalScopedCost, 1)) * 100).toFixed(1)}% of total</span>
              </div>
            </div>
            <span className="text-xl text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500">›</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Executive Overview</h1>
          <p className="mt-1 text-sm text-slate-400 sm:text-base">{adminProduct === 'vault' ? 'Vault-only usage, cost, margin, clients, and service health' : 'Cross-service usage, cost, and margin across the Twin Protocol platform'}</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">Scope</span>
          <span className="mt-1 block text-sm font-semibold text-slate-500">{scopeLabel}</span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {productAlerts.map((alert) => {
          const Icon = alertIconMap[alert.sev] ?? CircleAlert;
          return (
            <article key={alert.text} className={`flex min-h-28 gap-3 rounded-2xl border p-4 shadow-panel ${alert.sev === 'danger' ? 'border-rose-200 bg-rose-50' : alert.sev === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <Icon size={18} className={alert.sev === 'danger' ? 'shrink-0 text-rose-500' : alert.sev === 'success' ? 'shrink-0 text-emerald-500' : 'shrink-0 text-amber-500'} />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-5 text-slate-700">{alert.text}</h3>
                <p className="mt-2 text-sm text-slate-400">{alert.meta}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${adminProduct === 'vault' ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {overviewMetrics.map((metric) => {
          const config = metricConfig.find((item) => item.key === metric.key);
          const Icon = config.icon;
          return (
            <article key={metric.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:shadow-floating">
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.tone === 'green' ? 'bg-emerald-50 text-emerald-500' : config.tone === 'orange' ? 'bg-amber-50 text-amber-500' : config.tone === 'red' ? 'bg-rose-50 text-rose-500' : config.tone === 'sky' ? 'bg-sky-50 text-sky-500' : config.tone === 'violet' ? 'bg-violet-50 text-violet-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  <Icon size={18} />
                </span>
                {metric.badge ? (
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${metric.badge.direction === 'up' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
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
        })}
      </div>

      {adminProduct === 'twin' ? (
        <div>
            {filebaseQuotaStatus === 'loading' ? (
              <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-panel" aria-label="Loading Filebase quota" />
            ) : filebaseQuotaStatus === 'ready' ? (
              <VaultQuotaCard
                percentage={filebaseQuota.usagePercent}
                storageUsed={filebaseQuota.totalUsage}
                storageLimit={filebaseQuota.totalQuota}
              />
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-panel">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Filebase quota unavailable</h2>
                  <p className="mt-1 text-sm text-slate-500">The storage API did not return a valid provisioned quota.</p>
                </div>
              </div>
            )}
        </div>
      ) : null}

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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Usage by modality</h2>
          </div>
          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-start lg:gap-8 xl:flex-col xl:items-center">
            <div className="relative h-44 w-44 shrink-0">
              <canvas ref={modalityChartRef} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <strong className="text-xl font-bold tracking-tight text-slate-900">{formatOverviewMetric(summary.totalMessages)}</strong>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">messages</span>
              </div>
            </div>
            <div className="w-full min-w-0 flex-1 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 transition hover:bg-slate-100/80">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  Text
                </span>
                <div className="text-right">
                  <strong className="font-bold text-slate-800">{formatOverviewMetric(summary.modalityValues[0])}</strong>
                  <span className="ml-1.5 text-xs text-slate-400">({Math.round((summary.modalityValues[0] / Math.max(summary.totalMessages, 1)) * 100)}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 transition hover:bg-slate-100/80">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Audio
                </span>
                <div className="text-right">
                  <strong className="font-bold text-slate-800">{formatOverviewMetric(summary.modalityValues[1])}</strong>
                  <span className="ml-1.5 text-xs text-slate-400">({Math.round((summary.modalityValues[1] / Math.max(summary.totalMessages, 1)) * 100)}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 transition hover:bg-slate-100/80">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Video
                </span>
                <div className="text-right">
                  <strong className="font-bold text-slate-800">{formatOverviewMetric(summary.modalityValues[2])}</strong>
                  <span className="ml-1.5 text-xs text-slate-400">({Math.round((summary.modalityValues[2] / Math.max(summary.totalMessages, 1)) * 100)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Cost by vendor</h2>
            <div className="text-xs font-medium text-slate-400">stacked, per {filters.gran}</div>
          </div>
          <div className="relative mt-5 h-72">
            <canvas ref={vendorChartRef} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Environment comparison</h2>
          </div>
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
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="flex flex-col">
                    <strong>{item.cost}</strong>
                    <span className="mt-1 text-xs text-slate-400">Cost</span>
                  </div>
                  <div className="flex flex-col">
                    <strong>{item.revenue}</strong>
                    <span className="mt-1 text-xs text-slate-400">Revenue</span>
                  </div>
                  <div className="flex flex-col">
                    <strong>{item.messages}</strong>
                    <span className="mt-1 text-xs text-slate-400">Messages</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className={`grid gap-4 ${adminProduct === 'vault' ? '' : 'lg:grid-cols-2'}`}>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Top 5 Clients by cost</h2>
            <div className="text-xs font-medium text-slate-400">click to drill</div>
          </div>
          {renderRankList(topClients, 'client')}
        </section>

        {adminProduct !== 'vault' ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Top 5 Twins by cost</h2>
            <div className="text-xs font-medium text-slate-400">click to drill</div>
          </div>
          {renderRankList(topTwins, 'twin')}
        </section> : null}
      </div>

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
