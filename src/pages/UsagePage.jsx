import { useContext, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { selectFacts, sumMetric, timeSeries } from '../demo-data/superadminSelectors';
import { areaChart, stackedBar } from '../utils/chartHelpers';
import { formatNumber, formatCurrency, formatPercent, envBadge } from '../utils/dashboardUtils';

const metricCards = [
  { key: 'messages', label: 'Messages', icon: 'messages-square', tone: 'primary' },
  { key: 'tokens', label: 'OpenAI tokens', icon: 'cpu', tone: 'emerald' },
  { key: 'videoMins', label: 'Video minutes', icon: 'video', tone: 'violet' },
  { key: 'voiceChars', label: 'Voice chars', icon: 'mic', tone: 'sky' },
  { key: 'storageGB', label: 'Storage (GB)', icon: 'hard-drive', tone: 'amber' },
];

export function UsagePage() {
  const { filters } = useContext(FilterContext);
  const rows = useMemo(() => selectFacts(filters), [filters]);
  const labels = useMemo(() => timeSeries(rows, 'cost', filters).labels, [rows, filters]);

  const summary = useMemo(
    () => ({
      messages: sumMetric(rows, 'messages', filters),
      tokens: sumMetric(rows, 'tokens', filters),
      videoMins: sumMetric(rows, 'videoMins', filters),
      voiceChars: sumMetric(rows, 'voiceChars', filters),
      storageGB: sumMetric(rows, 'storageGB', filters),
    }),
    [rows, filters],
  );

  const modalityData = useMemo(
    () => [
      { label: 'Text', color: '#4f46e5', values: timeSeries(rows, 'mText', filters).values },
      { label: 'Audio', color: '#0ea5e9', values: timeSeries(rows, 'mAudio', filters).values },
      { label: 'Video', color: '#a855f7', values: timeSeries(rows, 'mVideo', filters).values },
    ],
    [rows, filters],
  );

  const tokenData = useMemo(
    () => [{ label: 'Tokens', color: '#10b981', values: timeSeries(rows, 'tokens', filters).values }],
    [rows, filters],
  );

  const videoData = useMemo(
    () => [{ label: 'Video min', color: '#a855f7', values: timeSeries(rows, 'videoMins', filters).values }],
    [rows, filters],
  );

  const voiceData = useMemo(
    () => [{ label: 'Voice chars', color: '#0ea5e9', values: timeSeries(rows, 'voiceChars', filters).values }],
    [rows, filters],
  );

  const storageData = useMemo(() => {
    const series = timeSeries(rows, 'storageGB', filters).values;
    let acc = 0;
    return [{ label: 'Cumulative GB', color: '#f59e0b', values: series.map((value) => (acc += value)) }];
  }, [rows, filters]);

  const apiData = useMemo(
    () => [{ label: 'API calls', color: '#4f46e5', values: timeSeries(rows, 'apiCalls', filters).values }],
    [rows, filters],
  );

  const heatmap = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid = [];
    let max = 0;
    for (let day = 0; day < 7; day += 1) {
      const row = [];
      for (let hour = 0; hour < 24; hour += 1) {
        const weekend = day >= 5 ? 0.55 : 1;
        const value = weekend * (Math.exp(-Math.pow(hour - 10, 2) / 14) + 0.85 * Math.exp(-Math.pow(hour - 20, 2) / 10) + 0.06);
        row.push(value);
        max = Math.max(max, value);
      }
      grid.push({ day: days[day], row });
    }
    return { grid, max };
  }, []);

  const modalityRef = useRef(null);
  const tokensRef = useRef(null);
  const videoRef = useRef(null);
  const voiceRef = useRef(null);
  const storageRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    const charts = [];
    if (modalityRef.current) charts.push(stackedBar(modalityRef.current, labels, modalityData, { fmt: formatNumber, yfmt: formatNumber, legend: true }));
    if (tokensRef.current) charts.push(areaChart(tokensRef.current, labels, tokenData, { fmt: formatNumber, yfmt: formatNumber }));
    if (videoRef.current) charts.push(areaChart(videoRef.current, labels, videoData, { fmt: formatNumber, yfmt: formatNumber }));
    if (voiceRef.current) charts.push(areaChart(voiceRef.current, labels, voiceData, { fmt: formatNumber, yfmt: formatNumber }));
    if (storageRef.current) charts.push(areaChart(storageRef.current, labels, storageData, { fmt: formatNumber, yfmt: formatNumber }));
    if (apiRef.current) charts.push(areaChart(apiRef.current, labels, apiData, { fmt: formatNumber, yfmt: formatNumber }));

    return () => charts.forEach((chart) => chart.destroy());
  }, [labels, modalityData, tokenData, videoData, voiceData, storageData, apiData]);

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Usage analytics"
        title="Usage analytics"
        description="Deep time-series across modalities, tokens, media, storage, and traffic."
      />

      <div className="stats-grid">
        {metricCards.map((card) => (
          <article key={card.key} className="stat-card">
            <div className="stat-card-top">
              <p className="stat-label">{card.label}</p>
              <span className={`status-dot ${card.tone}`}></span>
            </div>
            <h3>{formatNumber(summary[card.key])}</h3>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <div>
          <div className="card-header">
            <h2 className="section-title">Messages by modality</h2>
          </div>
          <div className="table-card chart-card">
            <div className="chart-wrapper">
              <canvas ref={modalityRef} />
            </div>
          </div>
        </div>

        <div>
          <div className="card-header">
            <h2 className="section-title">OpenAI tokens</h2>
          </div>
          <div className="table-card chart-card">
            <div className="chart-wrapper">
              <canvas ref={tokensRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div>
          <div className="card-header">
            <h2 className="section-title">Video minutes</h2>
          </div>
          <div className="table-card chart-card">
            <div className="chart-wrapper">
              <canvas ref={videoRef} />
            </div>
          </div>
        </div>

        <div>
          <div className="card-header">
            <h2 className="section-title">Voice characters</h2>
          </div>
          <div className="table-card chart-card">
            <div className="chart-wrapper">
              <canvas ref={voiceRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div>
          <div className="card-header">
            <h2 className="section-title">Storage growth</h2>
          </div>
          <div className="table-card chart-card">
            <div className="chart-wrapper">
              <canvas ref={storageRef} />
            </div>
          </div>
        </div>

        <div>
          <div className="card-header">
            <h2 className="section-title">API call volume</h2>
          </div>
          <div className="table-card chart-card">
            <div className="chart-wrapper">
              <canvas ref={apiRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="table-card px-5 py-4">
        <div className="card-header">
          <h2 className="section-title">Peak-hour activity</h2>
        </div>
        <div className="mt-4 space-y-3">
          {heatmap.grid.map((row) => (
            <div className="flex items-center gap-3" key={row.day}>
              <span className="heatmap-label">{row.day}</span>
              <div className="heatmap-row">
                {row.row.map((value, index) => {
                  const ratio = value / heatmap.max;
                  return <div key={index} className="heatmap-cell" style={{ backgroundColor: `rgba(79, 70, 229, ${0.08 + ratio * 0.92})` }} />;
                })}
              </div>
            </div>
          ))}
          <div className="heatmap-footer">
            <span>low</span>
            <div className="heatmap-scale">
              {[0.1, 0.3, 0.5, 0.7, 0.95].map((alpha) => (
                <span key={alpha} className="heatmap-scale-cell" style={{ backgroundColor: `rgba(79, 70, 229, ${alpha})` }} />
              ))}
            </div>
            <span>high</span>
          </div>
        </div>
      </div>
    </section>
  );
}
