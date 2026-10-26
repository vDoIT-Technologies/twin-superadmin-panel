import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, MessageSquareMore, Mic, Video } from 'lucide-react';
import { FilterContext } from '../app/FilterContext';
import { areaChart, stackedBar } from '../utils/chartHelpers';
import { formatNumber } from '../utils/dashboardUtils.jsx';
import { useAuth } from '../app/AuthContext';
import { FilterDropdown } from '../components/common/FilterDropdown';
import {
  loadUsageSummaryByRole,
  loadVideoMinutesSeries,
  loadVoiceCharsSeries,
  loadOpenAiTokensSeries,
  loadMessagesModalitySeries,
} from '../services/usageService';

function formatAxisMillions(value) {
  if (value === 0) return '0';
  if (value < 1000) return value.toString();
  if (value < 1000000) return `${(value / 1e3).toFixed(1)}k`;
  return `${(value / 1e6).toFixed(2)}M`;
}

function formatAxisBillions(value) {
  if (value === 0) return '0';
  return `${(value / 1e9).toFixed(2)}B`;
}

const formatCompact = (num) => {
  if (num == null) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`; // Show 'k' for thousands
  return new Intl.NumberFormat('en-US').format(num);
};

export function UsagePage() {
  const { adminProduct } = useAuth();
  const { filters, setFilters } = useContext(FilterContext);

  const isVault = adminProduct === 'vault';
  const metricCards = [
    { key: 'messages', label: 'Messages', icon: MessageSquareMore, tone: 'indigo' },
    { key: 'tokens', label: 'OpenAI tokens', icon: Cpu, tone: 'emerald' },
    {
      key: 'videoMins',
      label: isVault ? 'Transcribed Minutes' : 'Video minutes',
      icon: Video,
      tone: 'violet'
    },
    {
      key: 'voiceChars',
      label: isVault ? 'Transcription Credits' : 'Voice chars',
      icon: Mic,
      tone: 'sky'
    },
  ];

  const modalityRef = useRef(null);
  const tokensRef = useRef(null);
  const videoRef = useRef(null);
  const voiceRef = useRef(null);

  const [roleSummary, setRoleSummary] = useState(null);
  const [videoSeries, setVideoSeries] = useState(null);
  const [voiceSeries, setVoiceSeries] = useState(null);
  const [openAiSeries, setOpenAiSeries] = useState(null);
  const [modalitySeries, setModalitySeries] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const activeFilters = { envs: filters.envs };

    loadUsageSummaryByRole(activeFilters).then((r) => { if (!cancelled) setRoleSummary(r); });
    loadVideoMinutesSeries(activeFilters).then((r) => { if (!cancelled) setVideoSeries(r); });
    loadVoiceCharsSeries(activeFilters).then((r) => { if (!cancelled) setVoiceSeries(r); });
    loadOpenAiTokensSeries(activeFilters).then((r) => { if (!cancelled) setOpenAiSeries(r); });
    loadMessagesModalitySeries(activeFilters).then((r) => { if (!cancelled) setModalitySeries(r); });

    return () => { cancelled = true; };
  }, [filters.envs]);

  const liveCards = roleSummary?.live ? roleSummary.cards : null;

  const cardValueFor = (key) => {
    if (!liveCards) return null;
    if (key === 'messages') return liveCards.messages;
    if (key === 'tokens') return liveCards.openAiTokens;
    if (key === 'videoMins') return liveCards.videoMinutes;
    if (key === 'voiceChars') return liveCards.voiceChars;
    return null;
  };

  const modalityChartData = useMemo(() => {
    const points = modalitySeries?.series || [];
    return {
      labels: points.map((p) => {
        const [y, m] = p.month.split('-');
        return `${m}/${y.slice(2)}`;
      }),
      datasets: [
        { label: 'Text', color: '#4f46e5', data: points.map((p) => p.text) },
        ...(points.some((p) => p.audio > 0)
          ? [{ label: 'Audio', color: '#1d9bf0', data: points.map((p) => p.audio) }]
          : []),
        ...(points.some((p) => p.video > 0)
          ? [{ label: 'Video', color: '#a855f7', data: points.map((p) => p.video) }]
          : []),
      ],
    };
  }, [modalitySeries]);

  const openAiChartData = useMemo(() => {
    const points = openAiSeries?.series || [];
    return {
      labels: points.map((p) => {
        const [y, m] = p.month.split('-');
        return `${m}/${y.slice(2)}`;
      }),
      datasets: [{ label: 'OpenAI tokens', color: '#10b981', data: points.map((p) => p.value) }],
    };
  }, [openAiSeries]);

  const videoChartData = useMemo(() => {
    const points = videoSeries?.series || [];

    const labels = points.map((p) => {
      const [y, m] = p.month.split('-');
      return `${m}/${y.slice(2)}`;
    });

    if (isVault) {
      return {
        labels,
        datasets: [
          { label: 'Audio Transcribed (mins)', color: '#0ea5e9', data: points.map((p) => p.audio) },
          { label: 'Video Transcribed (mins)', color: '#a855f7', data: points.map((p) => p.video) },
        ],
      };
    }

    return {
      labels,
      datasets: [{ label: 'Video minutes', color: '#a855f7', data: points.map((p) => p.value) }],
    };
  }, [videoSeries, isVault]);

  const voiceChartData = useMemo(() => {
    const points = voiceSeries?.series || [];

    const labels = points.map((p) => {
      const [y, m] = p.month.split('-');
      return `${m}/${y.slice(2)}`;
    });

    if (isVault) {
      return {
        labels,
        datasets: [
          { label: 'Audio Credits', color: '#0ea5e9', data: points.map((p) => p.audio) },
          { label: 'Video Credits', color: '#a855f7', data: points.map((p) => p.video) },
        ],
      };
    }

    return {
      labels,
      datasets: [{ label: 'Voice chars', color: '#0ea5e9', data: points.map((p) => p.value) }],
    };
  }, [voiceSeries, isVault]);

  useEffect(() => {
    const charts = [];

    if (modalityRef.current && modalityChartData.labels.length > 0) {
      charts.push(
        stackedBar(modalityRef.current, modalityChartData.labels, modalityChartData.datasets, {
          legend: true,
          fmt: formatNumber,
          yfmt: formatAxisMillions,
        }),
      );
    }

    if (tokensRef.current && openAiChartData.labels.length > 0) {
      charts.push(
        areaChart(tokensRef.current, openAiChartData.labels, openAiChartData.datasets, {
          fmt: formatNumber,
          yfmt: formatAxisBillions,
        }),
      );
    }

    if (videoRef.current && videoChartData.labels.length > 0) {
      charts.push(
        areaChart(videoRef.current, videoChartData.labels, videoChartData.datasets, {
          fmt: formatNumber,
          yfmt: (value) => (value === 0 ? '0' : `${(value / 1e3).toFixed(1)}k`),
        }),
      );
    }

    if (voiceRef.current && voiceChartData.labels.length > 0) {
      charts.push(
        areaChart(voiceRef.current, voiceChartData.labels, voiceChartData.datasets, {
          fmt: formatNumber,
          yfmt: formatAxisMillions,
        }),
      );
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [modalityChartData, openAiChartData, videoChartData, voiceChartData]);

  return (
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex justify-end">
        <div className="w-64">
          <FilterDropdown
            value={filters.envs.length === 1 ? filters.envs[0] : null}
            onChange={(value) => setFilters((current) => ({ ...current, envs: value ? [value] : ['dev', 'staging', 'prod'] }))}
            options={[
              { value: 'dev', label: 'Development' },
              { value: 'staging', label: 'Staging' },
              { value: 'prod', label: 'Production' },
            ]}
            placeholder="All environments"
            searchPlaceholder="Search environment..."
            searchable={false}
            tone={isVault ? 'vault' : 'twin'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const cardValue = cardValueFor(card.key);
          const hasValue = cardValue != null;
          const displayValue = hasValue ? formatCompact(cardValue) : '—';

          return (
            <article key={card.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={17} />
                </span>
                {hasValue ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    All time
                  </span>
                ) : null}
              </div>
              <h2
                className="mt-4 max-w-full truncate text-2xl font-bold tracking-tight text-slate-800"
                title={hasValue ? formatNumber(cardValue) : '—'}
              >
                {displayValue}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{card.label}</p>
            </article>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Messages by modality</h2>
            {modalitySeries?.live ? (
              <span className="text-xs font-semibold text-slate-400">monthly</span>
            ) : null}
          </div>
          <div className="relative mt-4 h-72">
            {modalityChartData.labels.length > 0 ? (
              <canvas ref={modalityRef} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">OpenAI tokens</h2>
            {openAiSeries?.live ? (
              <span className="text-xs font-semibold text-slate-400">monthly</span>
            ) : null}
          </div>
          <div className="relative mt-4 h-72">
            {openAiChartData.labels.length > 0 ? (
              <canvas ref={tokensRef} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </section>
      </div>

      {/* Charts Row 2 */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">
              {isVault ? 'Transcribed Minutes (Video + Audio)' : 'Video minutes'}
            </h2>
            {videoSeries?.live ? (
              <span className="text-xs font-semibold text-slate-400">monthly</span>
            ) : null}
          </div>
          <div className="relative mt-4 h-60">
            {videoChartData.labels.length > 0 ? (
              <canvas ref={videoRef} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">
              {isVault ? 'Transcription Credits' : 'Voice characters'}
            </h2>
            {voiceSeries?.live ? (
              <span className="text-xs font-semibold text-slate-400">monthly</span>
            ) : null}
          </div>
          <div className="relative mt-4 h-60">
            {voiceChartData.labels.length > 0 ? (
              <canvas ref={voiceRef} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}