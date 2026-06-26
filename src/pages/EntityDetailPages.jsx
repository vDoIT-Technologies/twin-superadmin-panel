import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bot,
  Coins,
  MessagesSquare,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { FilterContext } from '../app/FilterContext';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import { selectFacts, sumMetric, timeSeries, twinShare, userShare } from '../demo-data/superadminSelectors';
import { areaChart, donut, hBar, stackedBar } from '../utils/chartHelpers';
import { envBadge, formatCurrency, formatCurrencyFull, formatNumber } from '../utils/dashboardUtils';

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim().slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatLastActive(daysAgo) {
  return daysAgo <= 0 ? 'today' : `${daysAgo}d ago`;
}

function getVaultId(userId) {
  let hash = 2166136261;

  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `vx_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function MetricCard({ icon: Icon, label, value, meta, tone = 'indigo' }) {
  return (
    <article className="entity-metric-card table-card">
      <div className="entity-metric-top">
        <span className={`entity-metric-icon entity-metric-icon-${tone}`}>
          <Icon size={16} />
        </span>
      </div>
      <h3>{value}</h3>
      <p>{label}</p>
      {meta ? <span className="entity-metric-meta">{meta}</span> : null}
    </article>
  );
}

function DetailHeader({ avatarClassName, initials, title, subtitle, onBack }) {
  return (
    <header className="entity-detail-header">
      <div className="entity-detail-header-main">
        <button type="button" className="entity-back-button" onClick={onBack}>
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="entity-detail-identity">
          <span className={`entity-detail-avatar ${avatarClassName}`}>{initials}</span>
          <div className="entity-detail-identity-copy">
            <h1>{title}</h1>
            <div className="entity-detail-subtitle">{subtitle}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function CardSection({ title, subtitle, children, flush = false }) {
  return (
    <section className={`table-card entity-detail-card${flush ? ' flush' : ''}`}>
      <div className="entity-detail-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function LegendList({ items, formatter = formatNumber }) {
  return (
    <div className="entity-legend-list">
      {items.map((item) => (
        <div key={item.label} className="entity-legend-row">
          <span className="entity-legend-key">
            <span className="entity-legend-dot" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
          <span className="entity-legend-value">{formatter(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function EntityListRow({ avatarClassName, initials, title, subtitle, meta, onClick }) {
  return (
    <button type="button" className="entity-link-row" onClick={onClick}>
      <span className={`entity-link-avatar ${avatarClassName}`}>{initials}</span>
      <span className="entity-link-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </span>
      {meta ? <span className="entity-link-meta">{meta}</span> : null}
    </button>
  );
}

function EmptyDetailState({ message }) {
  return <div className="entity-empty-state">{message}</div>;
}

function useClientRows(filters, clientId) {
  return useMemo(
    () =>
      selectFacts(
        {
          ...filters,
          client: null,
          twin: null,
          user: null,
          service: null,
          vendor: null,
        },
        { client: clientId },
      ),
    [clientId, filters],
  );
}

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { filters } = useContext(FilterContext);
  const [activeTab, setActiveTab] = useState('overview');
  const trendRef = useRef(null);
  const serviceShareRef = useRef(null);
  const serviceTrendRef = useRef(null);
  const vendorCostRef = useRef(null);
  const client = superadminDemoData.byId.client(clientId);
  const detailFilters = useMemo(
    () => ({
      ...filters,
      client: null,
      twin: null,
      user: null,
      service: null,
      vendor: null,
    }),
    [filters],
  );
  const rows = useClientRows(detailFilters, clientId);

  useEffect(() => {
    setActiveTab('overview');
  }, [clientId]);

  const summary = useMemo(() => {
    if (!client) return null;

    const cost = sumMetric(rows, 'cost', detailFilters);
    const revenue = sumMetric(rows, 'revenue', detailFilters);
    const messages = sumMetric(rows, 'messages', detailFilters);
    const pointsSpent = sumMetric(rows, 'pointsSpent', detailFilters);
    const twins = superadminDemoData.TWINS.filter((twin) => twin.clientId === client.id);
    const users = superadminDemoData.USERS.filter(
      (user) => user.clientId === client.id && detailFilters.envs.includes(user.env),
    );
    const margin = revenue ? ((revenue - cost) / revenue) * 100 : 0;

    return {
      cost,
      revenue,
      messages,
      pointsSpent,
      twins,
      users,
      margin,
    };
  }, [client, detailFilters, rows]);

  const serviceBreakdown = useMemo(() => {
    if (!client) return [];
    return superadminDemoData.SERVICES.map((service) => {
      const serviceRows = rows.filter((row) => row.service === service.id);
      const cost = sumMetric(serviceRows, 'cost', detailFilters);
      return { ...service, cost };
    }).filter((service) => service.cost > 0);
  }, [client, detailFilters, rows]);

  const vendorBreakdown = useMemo(() => {
    if (!client) return [];
    return superadminDemoData.VENDORS.map((vendor) => ({
      ...vendor,
      cost: sumMetric(rows, null, detailFilters, vendor.id),
    }))
      .filter((vendor) => vendor.cost > 0)
      .sort((left, right) => right.cost - left.cost);
  }, [client, detailFilters, rows]);

  const events = useMemo(
    () => superadminDemoData.EVENTS.filter((event) => event.clientId === clientId).slice(0, 30),
    [clientId],
  );

  useEffect(() => {
    if (!client || activeTab !== 'overview' || !trendRef.current || !serviceShareRef.current) return undefined;

    const trend = areaChart(
      trendRef.current,
      timeSeries(rows, 'cost', detailFilters).labels,
      [
        { label: 'Revenue', color: '#10b981', data: timeSeries(rows, 'revenue', detailFilters).values },
        { label: 'Cost', color: '#ef4444', data: timeSeries(rows, 'cost', detailFilters).values },
      ],
      { fmt: formatCurrency, yfmt: formatCurrency },
    );

    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#0ea5e9'];
    const share = donut(
      serviceShareRef.current,
      serviceBreakdown.map((service) => service.name),
      serviceBreakdown.map((service) => service.cost),
      serviceBreakdown.map((_, index) => colors[index % colors.length]),
      { fmt: formatCurrency },
    );

    return () => {
      trend.destroy();
      share.destroy();
    };
  }, [activeTab, client, detailFilters, rows, serviceBreakdown]);

  useEffect(() => {
    if (!client || activeTab !== 'services' || !serviceTrendRef.current) return undefined;

    const vendorsInScope = superadminDemoData.VENDORS.filter((vendor) =>
      rows.some((row) => (row.vendorCost[vendor.id] || 0) > 0),
    );
    const chart = stackedBar(
      serviceTrendRef.current,
      timeSeries(rows, 'cost', detailFilters).labels,
      vendorsInScope.map((vendor) => ({
        label: vendor.name,
        color: vendor.color,
        data: timeSeries(rows, null, detailFilters, vendor.id).values,
      })),
      { fmt: formatCurrency, yfmt: formatCurrency, legend: true },
    );

    return () => chart.destroy();
  }, [activeTab, client, detailFilters, rows]);

  useEffect(() => {
    if (!client || activeTab !== 'cost' || !vendorCostRef.current) return undefined;

    const chart = hBar(
      vendorCostRef.current,
      vendorBreakdown.map((vendor) => vendor.name),
      vendorBreakdown.map((vendor) => vendor.cost),
      vendorBreakdown.map((vendor) => vendor.color),
      { fmt: formatCurrency, xfmt: formatCurrency },
    );

    return () => chart.destroy();
  }, [activeTab, client, vendorBreakdown]);

  if (!client || !summary) {
    return (
      <section className="page-section entity-detail-page">
        <div className="empty-state">Client not found.</div>
      </section>
    );
  }

  const tabs = ['overview', 'twins', 'users', 'services', 'cost', 'timeline'];
  const totalServiceCost = serviceBreakdown.reduce((sum, service) => sum + service.cost, 0) || 1;

  return (
    <section className="page-section entity-detail-page">
      <DetailHeader
        avatarClassName="client"
        initials={getInitials(client.name)}
        title={client.name}
        subtitle={`${client.industry} · ${client.plan} plan`}
        onBack={() => navigate('/clients')}
      />

      <div className="entity-detail-metric-grid entity-detail-metric-grid-five">
        <MetricCard icon={Wallet} label="COGS" value={formatCurrency(summary.cost)} tone="indigo" />
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(summary.revenue)} tone="emerald" />
        <MetricCard icon={Percent} label="Margin" value={`${summary.margin.toFixed(1)}%`} tone="violet" />
        <MetricCard icon={Bot} label="Twins" value={String(summary.twins.length)} tone="rose" />
        <MetricCard icon={Users} label="Users" value={String(summary.users.length)} tone="amber" />
      </div>

      <div className="entity-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`entity-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="entity-detail-grid entity-detail-grid-sidebar">
          <CardSection title="Cost vs Revenue" subtitle="Last 30 days">
            <div className="entity-chart-wrap entity-chart-tall">
              <canvas ref={trendRef} />
            </div>
          </CardSection>
          <CardSection title="Cost by Service" subtitle={`${serviceBreakdown.length} services`}>
            <div className="entity-donut-wrap">
              <canvas ref={serviceShareRef} />
            </div>
            <LegendList
              formatter={formatCurrency}
              items={serviceBreakdown.map((service, index) => ({
                label: service.name,
                value: service.cost,
                color: ['#4f46e5', '#10b981', '#f59e0b', '#0ea5e9'][index % 4],
              }))}
            />
          </CardSection>
        </div>
      ) : null}

      {activeTab === 'twins' ? (
        <CardSection title={`${summary.twins.length} twins`} flush>
          {summary.twins.length ? (
            <div className="entity-list">
              {summary.twins.map((twin) => (
                <EntityListRow
                  key={twin.id}
                  avatarClassName="twin"
                  initials={getInitials(twin.name)}
                  title={twin.name}
                  subtitle={twin.role}
                  meta={`${(twinShare(twin) * 100).toFixed(1)}% share`}
                  onClick={() => navigate(`/twins/${twin.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No twins found for this client." />
          )}
        </CardSection>
      ) : null}

      {activeTab === 'users' ? (
        <CardSection title={`${summary.users.length} users`} flush>
          {summary.users.length ? (
            <div className="entity-list">
              {summary.users.map((user) => (
                <EntityListRow
                  key={user.id}
                  avatarClassName="user"
                  initials={getInitials(user.name)}
                  title={user.name}
                  subtitle={`${superadminDemoData.ENV_META[user.env].label} · ${formatNumber(user.pointsBalance)} points`}
                  meta={formatLastActive(user.lastActiveDaysAgo)}
                  onClick={() => navigate(`/users/${user.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No users found in the selected environments." />
          )}
        </CardSection>
      ) : null}

      {activeTab === 'services' ? (
        <CardSection title="Service Usage" subtitle="Vendor cost over time">
          <div className="entity-chart-wrap entity-chart-tall">
            <canvas ref={serviceTrendRef} />
          </div>
        </CardSection>
      ) : null}

      {activeTab === 'cost' ? (
        <div className="entity-detail-grid entity-detail-grid-sidebar">
          <CardSection title="Cost by Vendor" subtitle="Current scope">
            <div className="entity-chart-wrap entity-chart-tall">
              <canvas ref={vendorCostRef} />
            </div>
          </CardSection>
          <CardSection title="Vendor Breakdown" subtitle={formatCurrencyFull(summary.cost)} flush>
            <div className="entity-table-list">
              {vendorBreakdown.map((vendor) => (
                <div key={vendor.id} className="entity-table-row">
                  <span className="entity-table-name">
                    <span className="entity-legend-dot" style={{ backgroundColor: vendor.color }} />
                    {vendor.name}
                  </span>
                  <span>{formatCurrencyFull(vendor.cost)}</span>
                  <span>{((vendor.cost / totalServiceCost) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardSection>
        </div>
      ) : null}

      {activeTab === 'timeline' ? (
        <CardSection title="Recent Activity" subtitle={`${events.length} latest events`} flush>
          {events.length ? (
            <div className="entity-timeline-list">
              {events.map((event) => {
                const twin = superadminDemoData.byId.twin(event.twinId);
                return (
                  <div key={`${event.ts}-${event.event}-${event.userId}`} className="entity-timeline-row">
                    <span className={`entity-timeline-status ${event.level}`} />
                    <span className="entity-timeline-ts">{event.tsLabel}</span>
                    <span>{envBadge(event.env)}</span>
                    <span className="entity-timeline-event">{event.event}</span>
                    <span className="entity-timeline-meta">{twin?.name ?? 'Unknown twin'}</span>
                    <span className="entity-timeline-units">
                      {formatNumber(event.units)} {event.unitLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyDetailState message="No recent activity in this scope." />
          )}
        </CardSection>
      ) : null}
    </section>
  );
}

export function TwinDetailPage() {
  const navigate = useNavigate();
  const { twinId } = useParams();
  const { filters } = useContext(FilterContext);
  const trendRef = useRef(null);
  const modalityRef = useRef(null);
  const vendorRef = useRef(null);
  const twin = superadminDemoData.byId.twin(twinId);
  const client = twin ? superadminDemoData.byId.client(twin.clientId) : null;
  const detailFilters = useMemo(
    () => ({
      ...filters,
      client: null,
      twin: null,
      user: null,
      service: null,
      vendor: null,
    }),
    [filters],
  );
  const rows = useClientRows(detailFilters, twin?.clientId);

  const summary = useMemo(() => {
    if (!twin) return null;
    const share = twinShare(twin);
    const messages = sumMetric(rows, 'messages', detailFilters) * share;
    const cost = sumMetric(rows, 'cost', detailFilters) * share;
    const revenue = sumMetric(rows, 'revenue', detailFilters) * share;
    const tokens = sumMetric(rows, 'tokens', detailFilters) * share;
    const voiceChars = sumMetric(rows, 'voiceChars', detailFilters) * share;
    const videoMins = sumMetric(rows, 'videoMins', detailFilters) * share;
    const textMessages = messages * twin.modalityMix.text;
    const audioMessages = messages * twin.modalityMix.audio;
    const videoMessages = messages * twin.modalityMix.video;
    const sources = Math.round(96 + twin.weight * 48 + twin.createdDaysAgo * 0.12);
    return {
      share,
      messages,
      cost,
      revenue,
      tokens,
      voiceChars,
      videoMins,
      textMessages,
      audioMessages,
      videoMessages,
      sources,
    };
  }, [detailFilters, rows, twin]);

  const vendorBreakdown = useMemo(() => {
    if (!summary) return [];
    return superadminDemoData.VENDORS.map((vendor) => ({
      ...vendor,
      cost: sumMetric(rows, null, detailFilters, vendor.id) * summary.share,
    }))
      .filter((vendor) => vendor.cost > 0)
      .sort((left, right) => right.cost - left.cost);
  }, [detailFilters, rows, summary]);

  useEffect(() => {
    if (!twin || !summary || !trendRef.current || !modalityRef.current || !vendorRef.current) return undefined;

    const labels = timeSeries(rows, 'messages', detailFilters).labels;
    const base = timeSeries(rows, 'messages', detailFilters).values.map((value) => value * summary.share);

    const trend = stackedBar(
      trendRef.current,
      labels,
      [
        { label: 'Text', color: '#4f46e5', data: base.map((value) => value * twin.modalityMix.text) },
        { label: 'Audio', color: '#0ea5e9', data: base.map((value) => value * twin.modalityMix.audio) },
        { label: 'Video', color: '#a855f7', data: base.map((value) => value * twin.modalityMix.video) },
      ],
      { fmt: formatNumber, yfmt: formatNumber, legend: true },
    );

    const mod = donut(
      modalityRef.current,
      ['Text', 'Audio', 'Video'],
      [summary.textMessages, summary.audioMessages, summary.videoMessages],
      ['#4f46e5', '#0ea5e9', '#a855f7'],
      { fmt: formatNumber },
    );

    const vendor = hBar(
      vendorRef.current,
      vendorBreakdown.map((entry) => entry.name),
      vendorBreakdown.map((entry) => entry.cost),
      vendorBreakdown.map((entry) => entry.color),
      { fmt: formatCurrency, xfmt: formatCurrency },
    );

    return () => {
      trend.destroy();
      mod.destroy();
      vendor.destroy();
    };
  }, [detailFilters, rows, summary, twin, vendorBreakdown]);

  if (!twin || !client || !summary) {
    return (
      <section className="page-section entity-detail-page">
        <div className="empty-state">Twin not found.</div>
      </section>
    );
  }

  const ingestionItems = [
    ['LinkedIn / Twitter / web', Math.round(summary.sources * 0.55)],
    ['File uploads', Math.round(summary.sources * 0.3)],
    ['Manual entries', Math.round(summary.sources * 0.15)],
    ['Tokens embedded', Math.round(summary.tokens * 0.2)],
  ];

  return (
    <section className="page-section entity-detail-page">
      <DetailHeader
        avatarClassName="twin"
        initials={getInitials(twin.name)}
        title={twin.name}
        subtitle={`${twin.role} · ${client.name}`}
        onBack={() => navigate('/twins')}
      />

      <div className="entity-detail-metric-grid entity-detail-metric-grid-four">
        <MetricCard icon={MessagesSquare} label="Messages" value={formatNumber(summary.messages)} tone="indigo" />
        <MetricCard icon={Wallet} label="Cost" value={formatCurrency(summary.cost)} tone="rose" />
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(summary.revenue)} tone="emerald" />
        <MetricCard icon={BookOpen} label="Knowledge Sources" value={formatNumber(summary.sources)} tone="amber" />
      </div>

      <div className="entity-detail-grid entity-detail-grid-sidebar">
        <CardSection title="Chat Volume Trend" subtitle="Text, audio, video">
          <div className="entity-chart-wrap entity-chart-tall">
            <canvas ref={trendRef} />
          </div>
        </CardSection>
        <CardSection title="Modality Split" subtitle={`${formatNumber(summary.messages)} messages`}>
          <div className="entity-donut-wrap">
            <canvas ref={modalityRef} />
          </div>
          <LegendList
            items={[
              { label: 'Text', value: summary.textMessages, color: '#4f46e5' },
              { label: 'Audio', value: summary.audioMessages, color: '#0ea5e9' },
              { label: 'Video', value: summary.videoMessages, color: '#a855f7' },
            ]}
          />
        </CardSection>
      </div>

      <div className="entity-detail-grid entity-detail-grid-sidebar">
        <CardSection title="Cost Breakdown by Vendor" subtitle={formatCurrencyFull(summary.cost)}>
          <div className="entity-chart-wrap">
            <canvas ref={vendorRef} />
          </div>
        </CardSection>
        <CardSection title="Knowledge & Ingestion" subtitle="Estimated source mix" flush>
          <div className="entity-stats-list">
            {ingestionItems.map(([label, value]) => (
              <div key={label} className="entity-stat-row">
                <span>{label}</span>
                <strong>{formatNumber(value)}</strong>
              </div>
            ))}
          </div>
        </CardSection>
      </div>
    </section>
  );
}

export function UserDetailPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { filters } = useContext(FilterContext);
  const trendRef = useRef(null);
  const modalityRef = useRef(null);
  const user = superadminDemoData.byId.user(userId);
  const client = user ? superadminDemoData.byId.client(user.clientId) : null;
  const detailFilters = useMemo(
    () => ({
      ...filters,
      envs: user ? [user.env] : filters.envs,
      client: null,
      twin: null,
      user: null,
      service: null,
      vendor: null,
    }),
    [filters, user],
  );
  const rows = useClientRows(detailFilters, user?.clientId);

  const summary = useMemo(() => {
    if (!user) return null;
    const share = userShare(user);
    const messages = sumMetric(rows, 'messages', detailFilters) * share;
    const sessions = sumMetric(rows, 'sessions', detailFilters) * share;
    const pointsSpent = sumMetric(rows, 'pointsSpent', detailFilters) * share;
    const dollarValue = pointsSpent * superadminDemoData.RATE.pointUSD;
    const text = sumMetric(rows, 'mText', detailFilters) * share;
    const audio = sumMetric(rows, 'mAudio', detailFilters) * share;
    const video = sumMetric(rows, 'mVideo', detailFilters) * share;
    return {
      share,
      messages,
      sessions,
      pointsSpent,
      dollarValue,
      text,
      audio,
      video,
    };
  }, [detailFilters, rows, user]);

  const twins = useMemo(() => {
    if (!user) return [];
    return superadminDemoData.TWINS.filter((twin) => twin.clientId === user.clientId).slice(0, user.twinsUsed);
  }, [user]);

  const sessionHistory = useMemo(() => {
    if (!summary) return [];
    return Array.from({ length: 6 }, (_, index) => ({
      day: index === 0 ? 'today' : `${index * 2}d ago`,
      messages: Math.round((summary.messages / 6) * (1.4 - index * 0.12)),
      minutes: Math.round(8 + (6 - index) * 4),
      twin: twins[index % Math.max(1, twins.length)],
    }));
  }, [summary, twins]);

  useEffect(() => {
    if (!user || !summary || !trendRef.current || !modalityRef.current) return undefined;

    const trend = areaChart(
      trendRef.current,
      timeSeries(rows, 'pointsSpent', detailFilters).labels,
      [
        {
          label: 'Points spent',
          color: '#f59e0b',
          data: timeSeries(rows, 'pointsSpent', detailFilters).values.map((value) => value * summary.share),
        },
      ],
      { fmt: formatNumber, yfmt: formatNumber },
    );

    const mod = donut(
      modalityRef.current,
      ['Text', 'Audio', 'Video'],
      [summary.text, summary.audio, summary.video],
      ['#4f46e5', '#0ea5e9', '#a855f7'],
      { fmt: formatNumber },
    );

    return () => {
      trend.destroy();
      mod.destroy();
    };
  }, [detailFilters, rows, summary, user]);

  if (!user || !client || !summary) {
    return (
      <section className="page-section entity-detail-page">
        <div className="empty-state">User not found.</div>
      </section>
    );
  }

  return (
    <section className="page-section entity-detail-page">
      <DetailHeader
        avatarClassName="user"
        initials={getInitials(user.name)}
        title={user.name}
        subtitle={
          <>
            <span>{client.name}</span>
            <span>·</span>
            <span>{superadminDemoData.ENV_META[user.env].label}</span>
            <span className="entity-detail-vault-id">vaultId: {getVaultId(user.id)}</span>
          </>
        }
        onBack={() => navigate('/users')}
      />

      <div className="entity-detail-metric-grid entity-detail-metric-grid-four">
        <MetricCard icon={MessagesSquare} label="Messages" value={formatNumber(summary.messages)} tone="indigo" />
        <MetricCard icon={Activity} label="Sessions" value={formatNumber(summary.sessions)} tone="sky" />
        <MetricCard icon={Coins} label="Points Balance" value={formatNumber(user.pointsBalance)} tone="amber" />
        <MetricCard icon={Wallet} label="Spend Value" value={formatCurrency(summary.dollarValue)} tone="emerald" />
      </div>

      <div className="entity-detail-grid entity-detail-grid-sidebar">
        <CardSection title="Points Spent Over Time" subtitle="Last 30 days">
          <div className="entity-chart-wrap entity-chart-tall">
            <canvas ref={trendRef} />
          </div>
        </CardSection>
        <CardSection title="Modality Mix" subtitle={`${formatNumber(summary.messages)} messages`}>
          <div className="entity-donut-wrap">
            <canvas ref={modalityRef} />
          </div>
          <LegendList
            items={[
              { label: 'Text', value: summary.text, color: '#4f46e5' },
              { label: 'Audio', value: summary.audio, color: '#0ea5e9' },
              { label: 'Video', value: summary.video, color: '#a855f7' },
            ]}
          />
        </CardSection>
      </div>

      <div className="entity-detail-grid entity-detail-grid-even">
        <CardSection title="Twins Used" subtitle={`${twins.length} linked twins`} flush>
          {twins.length ? (
            <div className="entity-list">
              {twins.map((twin) => (
                <EntityListRow
                  key={twin.id}
                  avatarClassName="twin"
                  initials={getInitials(twin.name)}
                  title={twin.name}
                  subtitle={twin.role}
                  onClick={() => navigate(`/twins/${twin.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No twins used." />
          )}
        </CardSection>

        <CardSection title="Session History" subtitle={formatLastActive(user.lastActiveDaysAgo)} flush>
          <div className="entity-stats-list">
            {sessionHistory.map((session) => (
              <div key={`${session.day}-${session.twin?.id ?? 'none'}`} className="entity-stat-row">
                <span>{session.day}</span>
                <span>{session.twin?.name ?? 'No twin'}</span>
                <strong>
                  {formatNumber(session.messages)} msgs · {session.minutes}m
                </strong>
              </div>
            ))}
          </div>
        </CardSection>
      </div>
    </section>
  );
}
