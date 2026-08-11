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
import { useAuth } from '../app/AuthContext';
import { isServiceForProduct, isVendorForProduct } from '../utils/productAccess';
import { TruncatedText } from '../components/common/TruncatedText';

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
  const { adminProduct } = useAuth();
  const { filters } = useContext(FilterContext);
  const vendorChartRef = useRef(null);
  const pointsChartRef = useRef(null);

  const scopedFilters = useMemo(
    () => ({
      ...filters,
      service: adminProduct === 'vault' ? 'vault' : null,
      vendor: null,
      twin: null,
      user: null,
    }),
    [adminProduct, filters],
  );

  const rows = useMemo(
    () => selectFacts(scopedFilters).filter((row) => isServiceForProduct(adminProduct, row.service)),
    [adminProduct, scopedFilters],
  );
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

  const costDelta = useMemo(() => deltaPercent(scopedFilters, 'cost', null, adminProduct), [adminProduct, scopedFilters]);

  const vendorTimeData = useMemo(() => {
    const labels = timeSeries(rows, 'cost', scopedFilters).labels;
    const datasets = vendorOrder
      .filter((vendorId) => isVendorForProduct(adminProduct, vendorId))
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
  }, [adminProduct, rows, scopedFilters]);

  const budgetRows = useMemo(
    () =>
      superadminDemoData.SERVICES.filter((service) => isServiceForProduct(adminProduct, service.id)).map((service) => {
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
    [adminProduct, rows],
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
        .filter((vendorId) => isVendorForProduct(adminProduct, vendorId))
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
    [adminProduct, rows, summary.totalCost],
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
      .filter((vendorId) => isVendorForProduct(adminProduct, vendorId))
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
  }, [adminProduct, rows, summary.marginValue, summary.totalRevenue]);

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
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{adminProduct === 'vault' ? 'Vault Billing' : 'Cost & Billing'}</h1>
          <p className="mt-1 text-sm text-slate-400 sm:text-base">{adminProduct === 'vault' ? 'Vault-only storage vendor costs, budgets, revenue, and unit economics' : 'Vendor cost breakdown, budgets, unit economics and the points economy'}</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">Scope</span>
          <span className="mt-1 block text-sm font-semibold text-slate-500">{scopeLabel}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Wallet2 size={18} />
            </span>
            {costDelta != null ? <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">↑ {Math.abs(costDelta).toFixed(1)}%</span> : null}
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800">{formatCurrencyFull(summary.totalCost)}</h2>
          <p className="mt-1 text-sm text-slate-400">Total COGS</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock size={18} />
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800">{formatCurrencyFull(summary.projectedCost)}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Projected month-end <span className="text-slate-400">· run-rate</span>
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={18} />
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800">{formatCurrencyFull(summary.totalRevenue)}</h2>
          <p className="mt-1 text-sm text-slate-400">Revenue</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Percent size={18} />
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-800">{formatCurrencyFull(summary.marginValue)}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Margin <span className="text-slate-400">· {formatPercent(summary.marginPct, 1)}</span>
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Cost by vendor over time</h2>
            <span className="text-xs text-slate-400">stacked, per day</span>
          </div>
          <div className="relative mt-4 h-72">
            <canvas ref={vendorChartRef} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Margin waterfall</h2>
            <span className="text-xs text-slate-400">revenue → COGS</span>
          </div>
          <div className="mt-4 flex h-72 items-stretch gap-4">
            <div className="flex flex-col justify-between text-xs text-slate-400 font-mono">
              {waterfall.ticks.map((value) => (
                <span key={value}>{formatAxisCurrency(value)}</span>
              ))}
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-0 flex flex-col justify-between border-b border-slate-100">
                {[0, 1, 2, 3].map((line) => (
                  <span key={line} className="w-full border-b border-slate-100" />
                ))}
              </div>
              <div className="relative flex h-full items-end justify-around">
                {waterfall.steps.map((step) => {
                  const start = step.type === 'total' ? 0 : step.start;
                  const end = step.type === 'total' ? step.value : step.end;
                  const bottom = (Math.min(start, end) / waterfall.yMax) * 100;
                  const height = (Math.abs(end - start) / waterfall.yMax) * 100;

                  return (
                    <div key={step.id} className="flex h-full flex-col items-center justify-end">
                      <div className="relative w-12 flex-1">
                        <span
                          className="absolute w-full rounded-md shadow-xs transition-all"
                          style={{
                            backgroundColor: step.color,
                            bottom: `${bottom}%`,
                            height: `${Math.max(height, 1.5)}%`,
                          }}
                        />
                      </div>
                      <span className="mt-2 text-xs font-semibold text-slate-500">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Budget vs actual</h2>
            <span className="text-xs text-slate-400">monthly run-rate per service</span>
          </div>
          <div className="mt-4 space-y-3">
            {budgetRows.map((row) => (
              <div key={row.id} className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <strong className="font-semibold text-slate-700">{row.name}</strong>
                  <span className="text-slate-400">
                    <b className="font-bold text-slate-700">{formatCurrencyFull(row.actual)}</b> / {formatCurrencyFull(row.budget)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(row.variancePct, 100)}%` }} />
                  </div>
                  <b className="w-10 text-right text-xs font-bold text-slate-600">{Math.round(row.variancePct)}%</b>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Unit economics</h2>
            <span className="text-xs text-slate-400">blended across selected scope</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {unitEconomics.map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-bold text-slate-800">{item.value}</strong>
                  <span className="block truncate text-xs text-slate-400">{item.label}</span>
                </div>
              </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Points economy</h2>
            <span className="text-xs text-slate-400">purchased vs spent</span>
          </div>
          <div className="relative mt-4 h-72">
            <canvas ref={pointsChartRef} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Economy summary</h2>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {economySummaryRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 text-xs">
                <span className="font-medium text-slate-500">{row.label}</span>
                <strong className={`font-bold ${row.tone === 'emerald' ? 'text-emerald-600' : row.tone === 'indigo' ? 'text-indigo-600' : 'text-slate-800'}`}>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3 pb-4">
          <h2 className="text-base font-semibold text-slate-800">Vendor cost breakdown</h2>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50" onClick={exportVendorCsv}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Category</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">% of COGS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendorBreakdownRows.map((vendor) => (
                <tr key={vendor.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: vendor.color }} />
                      <strong className="font-semibold text-slate-800"><TruncatedText value={vendor.name} /></strong>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500"><TruncatedText value={vendor.category} /></td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrencyFull(vendor.cost)}</td>
                  <td className="px-4 py-3 text-slate-500">{vendor.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
