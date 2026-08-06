import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, HardDrive, MessageSquareMore, Mic, Video } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { selectFacts, sumMetric, timeSeries } from '../demo-data/superadminSelectors';
import { areaChart, stackedBar } from '../utils/chartHelpers';
import { deltaPercent, formatNumber } from '../utils/dashboardUtils.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { loadTokenUsage } from '../services/usageService';

const formatUSD = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const metricCards = [
  { key: 'messages', label: 'Messages', icon: MessageSquareMore, tone: 'indigo' },
  { key: 'tokens', label: 'OpenAI tokens', icon: Cpu, tone: 'emerald' },
  { key: 'videoMins', label: 'Video minutes', icon: Video, tone: 'violet' },
  { key: 'voiceChars', label: 'Voice chars', icon: Mic, tone: 'sky' },
  { key: 'storageGB', label: 'Storage (GB)', icon: HardDrive, tone: 'amber' },
];

function formatScopeLabel(filters) {
  if (filters.envs.length === superadminDemoData.ENVS.length) {
    return `All envs · last ${filters.range}`;
  }
  const separator = filters.envs.length > 1 ? ' + ' : ', ';
  const envLabel = filters.envs.map((env) => superadminDemoData.ENV_META[env]?.label ?? env).join(separator);
  return `${envLabel} · last ${filters.range}`;
}

function formatAxisMillions(value) {
  if (value === 0) return '0';
  return `${(value / 1e6).toFixed(2)}M`;
}

function formatAxisBillions(value) {
  if (value === 0) return '0';
  return `${(value / 1e9).toFixed(2)}B`;
}

export function UsagePage() {
  const { filters } = useContext(FilterContext);
  const modalityRef = useRef(null);
  const tokensRef = useRef(null);
  const videoRef = useRef(null);
  const voiceRef = useRef(null);
  const storageRef = useRef(null);
  const apiRef = useRef(null);

  const scopedFilters = useMemo(
    () => ({
      ...filters,
      service: null,
      vendor: null,
    }),
    [filters],
  );

  const rows = useMemo(() => selectFacts(scopedFilters), [scopedFilters]);
  const scopeLabel = useMemo(() => formatScopeLabel(filters), [filters]);
  const labels = useMemo(() => timeSeries(rows, 'messages', scopedFilters).labels, [rows, scopedFilters]);

  const summary = useMemo(
    () => ({
      messages: sumMetric(rows, 'messages', scopedFilters),
      tokens: sumMetric(rows, 'tokens', scopedFilters),
      videoMins: sumMetric(rows, 'videoMins', scopedFilters),
      voiceChars: sumMetric(rows, 'voiceChars', scopedFilters),
      storageGB: sumMetric(rows, 'storageGB', scopedFilters),
    }),
    [rows, scopedFilters],
  );

  const modalityData = useMemo(
    () => [
      { label: 'Text', color: '#4f46e5', data: timeSeries(rows, 'mText', scopedFilters).values },
      { label: 'Audio', color: '#1d9bf0', data: timeSeries(rows, 'mAudio', scopedFilters).values },
      { label: 'Video', color: '#a855f7', data: timeSeries(rows, 'mVideo', scopedFilters).values },
    ],
    [rows, scopedFilters],
  );

  const tokenSeries = useMemo(
    () => [{ label: 'Tokens', color: '#10b981', data: timeSeries(rows, 'tokens', scopedFilters).values }],
    [rows, scopedFilters],
  );

  // Live OpenAI token usage from the SuperAdmin backend (falls back to demo).
  const [liveUsage, setLiveUsage] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadTokenUsage(scopedFilters).then((result) => {
      if (!cancelled) setLiveUsage(result);
    });
    return () => {
      cancelled = true;
    };
  }, [scopedFilters]);

  const isLive = Boolean(liveUsage?.live);
  // When live, the OpenAI-tokens card, chart and breakdown tables use real data.
  const tokensValue = isLive ? liveUsage.totalTokens : summary.tokens;
  const tokenLabels = isLive && liveUsage.labels?.length ? liveUsage.labels : labels;
  const tokenChartSeries = useMemo(
    () =>
      isLive
        ? [{ label: 'Tokens', color: '#10b981', data: liveUsage.values || [] }]
        : tokenSeries,
    [isLive, liveUsage, tokenSeries],
  );

  // Per-user / per-client OpenAI token usage tables (live only).
  const userUsageColumns = useMemo(
    () => [
      {
        key: 'userId',
        label: 'User (personaUserId)',
        render: (r) => (r.userId && r.userId !== 'anonymous' ? `${String(r.userId).slice(0, 14)}…` : 'anonymous'),
      },
      { key: 'clientName', label: 'Client' },
      { key: 'tokens', label: 'Tokens', render: (r) => formatNumber(r.tokens) },
      { key: 'promptTokens', label: 'Prompt', render: (r) => formatNumber(r.promptTokens) },
      { key: 'completionTokens', label: 'Completion', render: (r) => formatNumber(r.completionTokens) },
      { key: 'apiCalls', label: 'Calls', render: (r) => formatNumber(r.apiCalls) },
      { key: 'cost', label: 'Cost', render: (r) => formatUSD(r.cost) },
    ],
    [],
  );
  const userUsageRows = useMemo(
    () => (liveUsage?.byUser || []).map((u) => ({ ...u, userId: u.userId || 'anonymous' })),
    [liveUsage],
  );

  const clientUsageColumns = useMemo(
    () => [
      { key: 'clientName', label: 'Client' },
      { key: 'tokens', label: 'Tokens', render: (r) => formatNumber(r.tokens) },
      { key: 'promptTokens', label: 'Prompt', render: (r) => formatNumber(r.promptTokens) },
      { key: 'completionTokens', label: 'Completion', render: (r) => formatNumber(r.completionTokens) },
      { key: 'apiCalls', label: 'Calls', render: (r) => formatNumber(r.apiCalls) },
      { key: 'cost', label: 'Cost', render: (r) => formatUSD(r.cost) },
    ],
    [],
  );
  const clientUsageRows = useMemo(
    () =>
      (liveUsage?.byClient || []).map((c, i) => ({
        ...c,
        clientKey: c.clientId || c.clientName || `row-${i}`,
      })),
    [liveUsage],
  );

  const videoSeries = useMemo(
    () => [{ label: 'Video minutes', color: '#a855f7', data: timeSeries(rows, 'videoMins', scopedFilters).values }],
    [rows, scopedFilters],
  );

  const voiceSeries = useMemo(
    () => [{ label: 'Voice chars', color: '#0ea5e9', data: timeSeries(rows, 'voiceChars', scopedFilters).values }],
    [rows, scopedFilters],
  );

  const storageSeries = useMemo(() => {
    const base = timeSeries(rows, 'storageGB', scopedFilters).values;
    let acc = 0;
    return [{ label: 'Storage', color: '#f59e0b', data: base.map((value) => (acc += value)) }];
  }, [rows, scopedFilters]);

  const apiSeries = useMemo(
    () => [{ label: 'API calls', color: '#4f46e5', data: timeSeries(rows, 'apiCalls', scopedFilters).values }],
    [rows, scopedFilters],
  );

  const heatmap = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid = [];
    let max = 0;

    for (let day = 0; day < 7; day += 1) {
      const row = [];
      for (let hour = 0; hour < 24; hour += 1) {
        const weekend = day >= 5 ? 0.55 : 1;
        const value =
          weekend *
          (Math.exp(-Math.pow(hour - 10, 2) / 14) + 0.85 * Math.exp(-Math.pow(hour - 20, 2) / 10) + 0.06);
        row.push(value);
        max = Math.max(max, value);
      }
      grid.push({ day: days[day], row });
    }

    return { grid, max };
  }, []);

  useEffect(() => {
    const charts = [];

    if (modalityRef.current) {
      charts.push(
        stackedBar(modalityRef.current, labels, modalityData, {
          legend: true,
          fmt: formatNumber,
          yfmt: formatAxisMillions,
        }),
      );
    }

    if (tokensRef.current) {
      charts.push(
        areaChart(tokensRef.current, tokenLabels, tokenChartSeries, {
          fmt: formatNumber,
          yfmt: formatAxisBillions,
        }),
      );
    }

    if (videoRef.current) {
      charts.push(
        areaChart(videoRef.current, labels, videoSeries, {
          fmt: formatNumber,
          yfmt: (value) => (value === 0 ? '0' : `${(value / 1e3).toFixed(1)}k`),
        }),
      );
    }

    if (voiceRef.current) {
      charts.push(
        areaChart(voiceRef.current, labels, voiceSeries, {
          fmt: formatNumber,
          yfmt: formatAxisMillions,
        }),
      );
    }

    if (storageRef.current) {
      charts.push(
        areaChart(storageRef.current, labels, storageSeries, {
          fmt: formatNumber,
          yfmt: formatAxisMillions,
        }),
      );
    }

    if (apiRef.current) {
      charts.push(
        areaChart(apiRef.current, labels, apiSeries, {
          fmt: formatNumber,
          yfmt: formatAxisMillions,
        }),
      );
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [apiSeries, labels, modalityData, storageSeries, tokenChartSeries, tokenLabels, videoSeries, voiceSeries]);

  return (
    <section className="page-section usage-demo-page">
      <header className="usage-demo-header">
        <div className="usage-demo-header-copy">
          <h1>Usage Analytics</h1>
          <p>Deep time-series across modalities, tokens, media, storage and traffic</p>
        </div>
        <div className="usage-demo-scope">
          <span className="usage-demo-scope-label">Scope</span>
          <span className="usage-demo-scope-value">{scopeLabel}</span>
        </div>
      </header>

      <div className="usage-demo-metric-grid">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const delta = card.key === 'storageGB' ? null : deltaPercent(scopedFilters, card.key);
          const cardValue = card.key === 'tokens' ? tokensValue : summary[card.key];

          return (
            <article key={card.key} className="table-card usage-demo-metric-card">
              <div className="usage-demo-metric-top">
                <span className={`usage-demo-metric-icon usage-demo-metric-icon-${card.tone}`}>
                  <Icon size={17} />
                </span>
                {card.key === 'tokens' && isLive ? (
                  <span className="usage-demo-metric-delta">live</span>
                ) : delta != null ? (
                  <span className="usage-demo-metric-delta">^ {Math.abs(delta).toFixed(1)}%</span>
                ) : null}
              </div>
              <h2>{formatNumber(cardValue)}</h2>
              <p>{card.label}</p>
            </article>
          );
        })}
      </div>

      <div className="usage-demo-chart-grid">
        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>Messages by modality</h2>
            <span>stacked, per day</span>
          </div>
          <div className="chart-wrapper usage-demo-chart-wrapper">
            <canvas ref={modalityRef} />
          </div>
        </section>

        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>OpenAI tokens</h2>
            <span>{isLive ? 'live · PERSONA usage' : 'demo data'}</span>
          </div>
          <div className="chart-wrapper usage-demo-chart-wrapper">
            <canvas ref={tokensRef} />
          </div>
        </section>
      </div>

      <div className="usage-demo-triple-grid">
        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>Video minutes</h2>
          </div>
          <div className="chart-wrapper usage-demo-chart-wrapper">
            <canvas ref={videoRef} />
          </div>
        </section>

        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>Voice characters</h2>
          </div>
          <div className="chart-wrapper usage-demo-chart-wrapper">
            <canvas ref={voiceRef} />
          </div>
        </section>

        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>Storage growth (GB)</h2>
          </div>
          <div className="chart-wrapper usage-demo-chart-wrapper">
            <canvas ref={storageRef} />
          </div>
        </section>
      </div>

      <div className="usage-demo-bottom-grid">
        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>API call volume</h2>
            <span>SDK gateway telemetry</span>
          </div>
          <div className="chart-wrapper usage-demo-chart-wrapper">
            <canvas ref={apiRef} />
          </div>
        </section>

        <section className="table-card usage-demo-chart-card usage-demo-heatmap-card">
          <div className="usage-demo-card-head">
            <h2>Peak-hour heatmap</h2>
            <span>UTC</span>
          </div>
          <div className="usage-demo-heatmap">
            <div className="usage-demo-heatmap-grid">
              {heatmap.grid.map((row) => (
                <div key={row.day} className="usage-demo-heatmap-row">
                  <span className="usage-demo-heatmap-day">{row.day}</span>
                  <div className="usage-demo-heatmap-cells">
                    {row.row.map((value, index) => {
                      const ratio = value / heatmap.max;
                      return (
                        <span
                          key={index}
                          className="usage-demo-heatmap-cell"
                          style={{ backgroundColor: `rgba(79, 70, 229, ${0.10 + ratio * 0.90})` }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="usage-demo-heatmap-footer">
              <div className="usage-demo-heatmap-hours">
                <span>00</span>
                <span>06</span>
                <span>12</span>
                <span>18</span>
                <span>23</span>
              </div>
              <div className="usage-demo-heatmap-scale">
                <span>low</span>
                <div className="usage-demo-heatmap-scale-cells">
                  {[0.12, 0.28, 0.44, 0.6, 0.76, 0.92].map((alpha) => (
                    <span key={alpha} className="usage-demo-heatmap-scale-cell" style={{ backgroundColor: `rgba(79, 70, 229, ${alpha})` }} />
                  ))}
                </div>
                <span>high</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="usage-demo-chart-grid">
        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>OpenAI tokens by user</h2>
            <span>{isLive ? 'live · per personaUserId' : 'connect backend for live data'}</span>
          </div>
          {isLive ? (
            <DataTable
              columns={userUsageColumns}
              rows={userUsageRows}
              rowKey="userId"
              emptyMessage="No token usage in range"
            />
          ) : (
            <p className="usage-demo-empty-hint">
              Set <code>VITE_API_BASE_URL</code> (and a SuperAdmin token) to load real per-user OpenAI token usage.
            </p>
          )}
        </section>

        <section className="table-card usage-demo-chart-card">
          <div className="usage-demo-card-head">
            <h2>OpenAI tokens by client</h2>
            <span>{isLive ? 'live · reconciled to TWIN client' : 'connect backend for live data'}</span>
          </div>
          {isLive ? (
            <DataTable
              columns={clientUsageColumns}
              rows={clientUsageRows}
              rowKey="clientKey"
              emptyMessage="No token usage in range"
            />
          ) : (
            <p className="usage-demo-empty-hint">
              Set <code>VITE_API_BASE_URL</code> (and a SuperAdmin token) to load real per-client OpenAI token usage.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
