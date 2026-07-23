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
import { dashboardService } from '../services';
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

function parseDecimal(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'object' && '$numberDecimal' in value) return Number(value.$numberDecimal) || 0;
  return 0;
}

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Lazy-loaded tab data (cached in state — don't re-fetch on tab switch back).
  const [tabData, setTabData] = useState({ twins: null, users: null, vault: null });
  const [tabLoading, setTabLoading] = useState('');

  useEffect(() => {
    setActiveTab('overview');
    let isActive = true;

    async function loadClient() {
      setIsLoading(true);
      try {
        const response = await dashboardService.getEntityClientById(clientId);
        if (!isActive) return;
        // response may be wrapped in { data: ... } by SuccessResponse
        const payload = response?.data || response;
        setClientData(payload);
      } catch (error) {
        console.error('GET /entities/clients/:id failed:', error);
        if (isActive) setClientData(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadClient();
    setTabData({ twins: null, users: null, vault: null });
    return () => { isActive = false; };
  }, [clientId]);

  // Lazy-load tab data on tab click.
  useEffect(() => {
    if (!clientData || activeTab === 'overview') return;
    if (tabData[activeTab] !== null) return; // already loaded

    let isActive = true;
    setTabLoading(activeTab);

    async function loadTab() {
      try {
        let data;
        if (activeTab === 'twins') data = await dashboardService.getEntityClientTwins(clientId);
        else if (activeTab === 'users') data = await dashboardService.getEntityClientUsers(clientId);
        else if (activeTab === 'vault') data = await dashboardService.getEntityClientVault(clientId);
        if (!isActive) return;
        const payload = data?.data || data;
        setTabData((prev) => ({ ...prev, [activeTab]: payload }));
      } catch (error) {
        console.error(`Tab ${activeTab} load failed:`, error);
        if (isActive) setTabData((prev) => ({ ...prev, [activeTab]: { error: true } }));
      } finally {
        if (isActive) setTabLoading('');
      }
    }

    loadTab();
    return () => { isActive = false; };
  }, [activeTab, clientData, clientId, tabData]);

  if (isLoading) {
    return (
      <section className="page-section entity-detail-page">
        <div className="empty-state">Loading client...</div>
      </section>
    );
  }

  if (!clientData) {
    return (
      <section className="page-section entity-detail-page">
        <div className="empty-state">Client not found.</div>
      </section>
    );
  }

  const { profile, kpis, usage } = clientData;
  const twins = tabData.twins?.twins || [];
  const users = tabData.users?.users || [];
  const vault = tabData.vault?.vault || [];
  const clientName = profile?.name || profile?.organizationName || '';
  const plan = profile?.plan || '';

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const num = Number(bytes);
    if (num >= 1099511627776) return `${(num / 1099511627776).toFixed(2)} TB`;
    if (num >= 1073741824) return `${(num / 1073741824).toFixed(2)} GB`;
    if (num >= 1048576) return `${(num / 1048576).toFixed(1)} MB`;
    if (num >= 1024) return `${(num / 1024).toFixed(0)} KB`;
    return `${num} B`;
  };

  const formatDateShort = (val) => {
    if (!val) return '-';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '-';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
  };

  const tabs = ['overview', 'twins', 'users', 'vault'];

  return (
    <section className="page-section entity-detail-page">
      <DetailHeader
        avatarClassName="client"
        initials={getInitials(clientName)}
        title={clientName}
        subtitle={`${profile?.organizationName || ''} · ${plan} plan`}
        onBack={() => navigate('/clients')}
      />

      <div className="entity-detail-metric-grid entity-detail-metric-grid-five">
        <MetricCard icon={Wallet} label="COGS" value={formatCurrency(kpis?.cost || 0)} tone="indigo" />
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(kpis?.revenue || 0)} tone="emerald" />
        <MetricCard icon={Percent} label="Margin" value={`${kpis?.margin || 0}%`} tone="violet" />
        <MetricCard icon={Bot} label="Twins" value={String(kpis?.twinsCount || 0)} tone="rose" />
        <MetricCard icon={Users} label="Users" value={String(kpis?.usersCount || 0)} tone="amber" />
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
        <div className="entity-detail-grid entity-detail-grid-even">
          <CardSection title="Client Info" flush>
            <div className="entity-stats-list">
              <div className="entity-stat-row"><span>Organization</span><strong>{profile?.organizationName || '-'}</strong></div>
              <div className="entity-stat-row"><span>Plan</span><strong>{plan || '-'}</strong></div>
              <div className="entity-stat-row"><span>Email</span><strong>{profile?.email || '-'}</strong></div>
              <div className="entity-stat-row"><span>Environment</span><strong>{profile?.env || '-'}</strong></div>
              <div className="entity-stat-row"><span>Created</span><strong>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</strong></div>
            </div>
          </CardSection>
          <CardSection title="Usage Summary" flush>
            <div className="entity-stats-list">
              <div className="entity-stat-row"><span>Total Tokens</span><strong>{formatNumber(usage?.tokens || 0)}</strong></div>
              <div className="entity-stat-row"><span>Prompt Tokens</span><strong>{formatNumber(usage?.promptTokens || 0)}</strong></div>
              <div className="entity-stat-row"><span>Completion Tokens</span><strong>{formatNumber(usage?.completionTokens || 0)}</strong></div>
              <div className="entity-stat-row"><span>API Calls</span><strong>{formatNumber(usage?.apiCalls || 0)}</strong></div>
              <div className="entity-stat-row"><span>Cost</span><strong>{formatCurrency(usage?.cost || 0)}</strong></div>
            </div>
          </CardSection>
        </div>
      ) : null}

      {activeTab === 'twins' && tabLoading === 'twins' ? (
        <CardSection title="Twins" flush><EmptyDetailState message="Loading twins..." /></CardSection>
      ) : null}

      {activeTab === 'twins' && tabLoading !== 'twins' ? (
        <CardSection title={`${twins?.length || 0} twins`} flush>
          {twins?.length ? (
            <div className="entity-table-list">
              <div className="entity-table-row entity-table-header">
                <span className="entity-table-name">Twin</span>
                <span>Est. Cost</span>
                <span>Share</span>
              </div>
              {twins.map((twin) => (
                <div
                  key={twin._id}
                  className="entity-table-row entity-row-clickable"
                  onClick={() => navigate(`/twins/${twin._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/twins/${twin._id}`)}
                >
                  <span className="entity-table-name">
                    <span className="entity-link-avatar twin">{getInitials(twin.name || '')}</span>
                    <span>
                      <strong>{twin.name || 'Unnamed'}</strong>
                      {twin.role ? <span className="entity-table-sub">{twin.role}</span> : null}
                    </span>
                  </span>
                  <span>{formatCurrency(twin.estCost || 0)}</span>
                  <span>{twin.share || 0}%</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No twins found for this client." />
          )}
        </CardSection>
      ) : null}

      {activeTab === 'users' && tabLoading === 'users' ? (
        <CardSection title="Users" flush><EmptyDetailState message="Loading users..." /></CardSection>
      ) : null}

      {activeTab === 'users' && tabLoading !== 'users' ? (
        <CardSection title={`${users?.length || 0} users`} flush>
          {users?.length ? (
            <div className="entity-table-list">
              <div className="entity-table-row entity-table-header">
                <span className="entity-table-name">User</span>
                <span>Env</span>
                <span>Points</span>
                <span>Twins used</span>
                <span>Last active</span>
              </div>
              {users.map((user) => (
                <div
                  key={user._id}
                  className="entity-table-row entity-row-clickable"
                  onClick={() => navigate(`/users/${user._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/users/${user._id}`)}
                >
                  <span className="entity-table-name">
                    <span className="entity-link-avatar user">{getInitials(user.name || '')}</span>
                    <span>
                      <strong>{user.name || 'Unnamed'}</strong>
                      <span className="entity-table-sub">{user.email || ''}</span>
                    </span>
                  </span>
                  <span>{envBadge(user.env)}</span>
                  <span>{formatNumber(parseDecimal(user.points))}</span>
                  <span>{user.twinsUsed || 0}</span>
                  <span>{formatDateShort(user.lastActive)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No users found for this client." />
          )}
        </CardSection>
      ) : null}

      {activeTab === 'vault' && tabLoading === 'vault' ? (
        <CardSection title="Vault" flush><EmptyDetailState message="Loading vault data..." /></CardSection>
      ) : null}

      {activeTab === 'vault' && tabLoading !== 'vault' ? (
        <div className="entity-detail-metric-grid entity-detail-metric-grid-six">
          <MetricCard icon={Activity} label="Stored on IPFS" value={formatBytes(vault?.reduce((s, v) => s + Number(v.storageUsed || 0), 0) || 0)} tone="indigo" />
          <MetricCard icon={BookOpen} label="Files pinned" value={formatNumber(vault?.reduce((s, v) => s + (v.filesCount || 0), 0) || 0)} tone="sky" />
          <MetricCard icon={Users} label="Active drives · users" value={String(vault?.filter((v) => Number(v.storageUsed || 0) > 0).length || 0)} tone="rose" />
          <MetricCard icon={Wallet} label="Filebase / IPFS · cost" value={formatCurrency(kpis?.cost || 0)} tone="violet" />
          <MetricCard icon={TrendingUp} label="Storage revenue" value={formatCurrency(kpis?.revenue || 0)} tone="emerald" />
          <MetricCard icon={Percent} label="Margin" value={`${kpis?.margin || 0}%`} tone="amber" />
        </div>
      ) : null}

      {activeTab === 'vault' && tabLoading !== 'vault' ? (
        <CardSection title={`${vault?.length || 0} vault drives`} flush>
          {vault?.length ? (
            <div className="entity-table-list">
              <div className="entity-table-row entity-table-header">
                <span className="entity-table-name">User / Drive</span>
                <span>Env</span>
                <span>Plan</span>
                <span>Used</span>
                <span>Quota</span>
                <span>Files</span>
                <span>Last active</span>
              </div>
              {vault.map((v) => (
                <div key={v.id} className="entity-table-row">
                  <span className="entity-table-name">
                    <span className="entity-link-avatar user">{getInitials(v.name || '')}</span>
                    <span>
                      <strong>{v.name || v.email || 'Unknown'}</strong>
                      <span className="entity-table-sub">{v.vaultId || ''}</span>
                    </span>
                  </span>
                  <span>{envBadge(v.__env)}</span>
                  <span>{v.planName || 'Free'}</span>
                  <span>{formatBytes(v.storageUsed)}</span>
                  <span>{formatBytes(v.storageLimit)}</span>
                  <span>{v.filesCount || 0}</span>
                  <span>{formatDateShort(v.updatedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No vault data found for this client." />
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
