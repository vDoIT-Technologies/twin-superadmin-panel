import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Coins,
  MessagesSquare,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dashboardService } from '../services';
import { envBadge, formatCurrency, formatNumber } from '../utils/dashboardUtils';

const DETAIL_PAGE_SIZE = 10;

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

function DetailPagination({ currentPage, itemCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(itemCount / DETAIL_PAGE_SIZE));
  const pageStart = itemCount === 0 ? 0 : (currentPage - 1) * DETAIL_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * DETAIL_PAGE_SIZE, itemCount);

  if (itemCount === 0) return null;

  return (
    <div className="clients-demo-footer entity-detail-pagination-footer">
      <span>{pageStart}-{pageEnd} of {itemCount}</span>
      <div className="clients-demo-pagination">
        <button
          type="button"
          disabled={currentPage === 1}
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft size={14} />
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button
          type="button"
          disabled={currentPage === totalPages}
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
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
  const location = useLocation();
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestedTab = searchParams.get('tab');
  const clientTabs = ['overview', 'twins', 'users', 'services', 'vault', 'cost', 'timeline'];
  const initialTab = clientTabs.includes(requestedTab) ? requestedTab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Lazy-loaded tab data (cached in state — don't re-fetch on tab switch back).
  const [tabData, setTabData] = useState({ twins: null, users: null, vault: null });
  const [tabLoading, setTabLoading] = useState('');
  const [tabPages, setTabPages] = useState({ twins: 1, users: 1, vault: 1 });

  useEffect(() => {
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
    setTabPages({ twins: 1, users: 1, vault: 1 });
    return () => { isActive = false; };
  }, [clientId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectTab = (tab) => {
    setActiveTab(tab);

    if (tab === 'overview') {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({ tab }, { replace: true });
  };

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
  const paginatedTwins = twins.slice((tabPages.twins - 1) * DETAIL_PAGE_SIZE, tabPages.twins * DETAIL_PAGE_SIZE);
  const paginatedUsers = users.slice((tabPages.users - 1) * DETAIL_PAGE_SIZE, tabPages.users * DETAIL_PAGE_SIZE);
  const paginatedVault = vault.slice((tabPages.vault - 1) * DETAIL_PAGE_SIZE, tabPages.vault * DETAIL_PAGE_SIZE);
  const setTabPage = (tab, page) => setTabPages((current) => ({ ...current, [tab]: page }));
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

  const tabs = clientTabs;
  const vaultStorage = vault.reduce((sum, item) => sum + Number(item.storageUsed || 0), 0);
  const vaultLimit = vault.reduce((sum, item) => sum + Number(item.storageLimit || 0), 0);
  const vaultFiles = vault.reduce((sum, item) => sum + Number(item.filesCount || 0), 0);

  return (
    <section className="page-section entity-detail-page">
      <DetailHeader
        avatarClassName="client"
        initials={getInitials(clientName)}
        title={clientName}
        subtitle={`${profile?.organizationName || ''} · ${plan} plan`}
        onBack={() => navigate(location.state?.from || '/clients')}
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
            onClick={() => selectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="entity-detail-grid entity-detail-grid-even">
          <CardSection title="Client info" flush>
            <div className="entity-stats-list">
              <div className="entity-stat-row"><span>Name</span><strong>{clientName || '-'}</strong></div>
              <div className="entity-stat-row"><span>Organization</span><strong>{profile?.organizationName || '-'}</strong></div>
              <div className="entity-stat-row"><span>Email</span><strong>{profile?.email || '-'}</strong></div>
              <div className="entity-stat-row"><span>Plan</span><strong>{plan || '-'}</strong></div>
              <div className="entity-stat-row"><span>Environment</span><strong>{profile?.env || '-'}</strong></div>
              <div className="entity-stat-row"><span>Created</span><strong>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</strong></div>
            </div>
          </CardSection>
          <CardSection title="Usage summary" flush>
            <div className="entity-stats-list">
              <div className="entity-stat-row"><span>Total tokens</span><strong>{formatNumber(usage?.tokens || 0)}</strong></div>
              <div className="entity-stat-row"><span>Prompt tokens</span><strong>{formatNumber(usage?.promptTokens || 0)}</strong></div>
              <div className="entity-stat-row"><span>Completion tokens</span><strong>{formatNumber(usage?.completionTokens || 0)}</strong></div>
              <div className="entity-stat-row"><span>Audio seconds</span><strong>{formatNumber(usage?.audioSeconds || 0)}</strong></div>
              <div className="entity-stat-row"><span>API calls</span><strong>{formatNumber(usage?.apiCalls || 0)}</strong></div>
              <div className="entity-stat-row"><span>Usage cost</span><strong>{formatCurrency(usage?.cost || 0)}</strong></div>
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
              {paginatedTwins.map((twin) => (
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
              <DetailPagination
                currentPage={tabPages.twins}
                itemCount={twins.length}
                onPageChange={(page) => setTabPage('twins', page)}
              />
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
              {paginatedUsers.map((user) => (
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
              <DetailPagination
                currentPage={tabPages.users}
                itemCount={users.length}
                onPageChange={(page) => setTabPage('users', page)}
              />
            </div>
          ) : (
            <EmptyDetailState message="No users found for this client." />
          )}
        </CardSection>
      ) : null}

      {activeTab === 'services' ? (
        <CardSection title="Services" flush>
          <EmptyDetailState message="A client service-breakdown API is not available, so no estimated values are shown." />
        </CardSection>
      ) : null}

      {activeTab === 'vault' && tabLoading === 'vault' ? (
        <CardSection title="Vault" flush><EmptyDetailState message="Loading vault data..." /></CardSection>
      ) : null}

      {activeTab === 'vault' && tabLoading !== 'vault' ? (
        <>
          <div className="entity-detail-metric-grid entity-detail-metric-grid-six">
            <MetricCard icon={Activity} label="Stored on IPFS" value={formatBytes(vaultStorage)} tone="indigo" />
            <MetricCard icon={BookOpen} label="Files pinned" value={formatNumber(vaultFiles)} tone="sky" />
            <MetricCard icon={Users} label="Active drives · users" value={String(vault?.filter((v) => Number(v.storageUsed || 0) > 0).length || 0)} tone="rose" />
            <MetricCard icon={Wallet} label="Storage limit" value={formatBytes(vaultLimit)} tone="violet" />
            <MetricCard icon={TrendingUp} label="Drives" value={formatNumber(vault.length)} tone="emerald" />
            <MetricCard icon={Percent} label="Average storage" value={formatBytes(vault.length ? vaultStorage / vault.length : 0)} tone="amber" />
          </div>
        </>
      ) : null}

      {activeTab === 'vault' && tabLoading !== 'vault' ? (
        <CardSection title="Vault drives" subtitle={`${vault.length} records returned by the client vault API`} flush>
          {vault.length ? (
            <div className="entity-table-list">
              <div className="entity-table-row entity-table-header">
                <span className="entity-table-name">User / drive</span><span>Storage</span><span>Limit</span><span>Files</span><span>Last active</span>
              </div>
              {paginatedVault.map((drive, index) => (
                <div key={drive._id || drive.userId || index} className="entity-table-row">
                  <span className="entity-table-name"><strong>{drive.name || drive.userName || drive.email || drive.vaultId || 'Vault drive'}</strong></span>
                  <span>{formatBytes(drive.storageUsed || 0)}</span>
                  <span>{formatBytes(drive.storageLimit || 0)}</span>
                  <span>{formatNumber(drive.filesCount || 0)}</span>
                  <span>{formatDateShort(drive.lastActive || drive.updatedAt)}</span>
                </div>
              ))}
              <DetailPagination
                currentPage={tabPages.vault}
                itemCount={vault.length}
                onPageChange={(page) => setTabPage('vault', page)}
              />
            </div>
          ) : <EmptyDetailState message="No vault records found for this client." />}
        </CardSection>
      ) : null}

      {activeTab === 'cost' ? (
        <CardSection title="Cost breakdown" flush>
          <EmptyDetailState message="A client vendor-cost breakdown API is not available, so no estimated values are shown." />
        </CardSection>
      ) : null}

      {activeTab === 'timeline' ? (
        <CardSection title="Recent activity" flush>
          <EmptyDetailState message="A client activity-timeline API is not available, so no generated events are shown." />
        </CardSection>
      ) : null}
    </section>
  );
}

export function TwinDetailPage() {
  const navigate = useNavigate();
  const { twinId } = useParams();
  const [twinData, setTwinData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const response = await dashboardService.getEntityTwinById(twinId);
        if (!active) return;
        setTwinData(response?.data || response);
      } catch (err) {
        console.error('GET /entities/twins/:id failed:', err);
        if (active) setTwinData(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [twinId]);

  if (isLoading) return <section className="page-section entity-detail-page"><div className="empty-state">Loading twin...</div></section>;
  if (!twinData) return <section className="page-section entity-detail-page"><div className="empty-state">Twin not found.</div></section>;

  const { profile, kpis, usage } = twinData;

  return (
    <section className="page-section entity-detail-page">
      <DetailHeader
        avatarClassName="twin"
        initials={getInitials(profile?.name || '')}
        title={profile?.name || 'Unnamed'}
        subtitle={`${profile?.role || ''} · ${profile?.clientName || ''}`}
        onBack={() => navigate('/twins')}
      />

      <div className="entity-detail-metric-grid entity-detail-metric-grid-four">
        <MetricCard icon={MessagesSquare} label="Messages" value={formatNumber(kpis?.messages || 0)} tone="indigo" />
        <MetricCard icon={Wallet} label="Cost" value={formatCurrency(kpis?.cost || 0)} tone="rose" />
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(kpis?.revenue || 0)} tone="emerald" />
        <MetricCard icon={BookOpen} label="Knowledge Sources" value={formatNumber(kpis?.knowledgeSources || 0)} tone="amber" />
      </div>

      <div className="entity-detail-grid entity-detail-grid-even">
        <CardSection title="Twin Info" flush>
          <div className="entity-stats-list">
            <div className="entity-stat-row"><span>Name</span><strong>{profile?.name || '-'}</strong></div>
            <div className="entity-stat-row"><span>Role</span><strong>{profile?.role || '-'}</strong></div>
            <div className="entity-stat-row"><span>Client</span><strong>{profile?.clientName || '-'}</strong></div>
            <div className="entity-stat-row"><span>Created</span><strong>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</strong></div>
          </div>
        </CardSection>
        <CardSection title="Usage Summary" flush>
          <div className="entity-stats-list">
            <div className="entity-stat-row"><span>Total Tokens</span><strong>{formatNumber(usage?.tokens || 0)}</strong></div>
            <div className="entity-stat-row"><span>Prompt Tokens</span><strong>{formatNumber(usage?.promptTokens || 0)}</strong></div>
            <div className="entity-stat-row"><span>Completion Tokens</span><strong>{formatNumber(usage?.completionTokens || 0)}</strong></div>
            <div className="entity-stat-row"><span>API Calls</span><strong>{formatNumber(usage?.apiCalls || 0)}</strong></div>
            <div className="entity-stat-row"><span>Audio Seconds</span><strong>{formatNumber(usage?.audioSeconds || 0)}</strong></div>
          </div>
        </CardSection>
      </div>
    </section>
  );
}

export function UserDetailPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const response = await dashboardService.getEntityUserById(userId);
        if (!active) return;
        setUserData(response?.data || response);
      } catch (err) {
        console.error('GET /entities/users/:id failed:', err);
        if (active) setUserData(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [userId]);

  if (isLoading) return <section className="page-section entity-detail-page"><div className="empty-state">Loading user...</div></section>;
  if (!userData) return <section className="page-section entity-detail-page"><div className="empty-state">User not found.</div></section>;

  const { profile, kpis, modalityMix, twins, sessionHistory } = userData;

  return (
    <section className="page-section entity-detail-page">
      <DetailHeader
        avatarClassName="user"
        initials={getInitials(profile?.name || '')}
        title={profile?.name || 'Unnamed'}
        subtitle={
          <>
            <span>{profile?.clientName || ''}</span>
            <span>·</span>
            <span>{profile?.env || ''}</span>
          </>
        }
        onBack={() => navigate('/users')}
      />

      <div className="entity-detail-metric-grid entity-detail-metric-grid-four">
        <MetricCard icon={MessagesSquare} label="Messages" value={formatNumber(kpis?.messages || 0)} tone="indigo" />
        <MetricCard icon={Activity} label="Sessions" value={formatNumber(kpis?.sessions || 0)} tone="sky" />
        <MetricCard icon={Coins} label="Points Balance" value={formatNumber(kpis?.pointsBalance || 0)} tone="amber" />
        <MetricCard icon={Wallet} label="Spend Value" value={formatCurrency(kpis?.spendValue || 0)} tone="emerald" />
      </div>

      <div className="entity-detail-grid entity-detail-grid-sidebar">
        <CardSection title="Modality Mix" subtitle={`${formatNumber(kpis?.messages || 0)} messages`} flush>
          <div className="entity-stats-list">
            <div className="entity-stat-row"><span>Text</span><strong>{formatNumber(modalityMix?.text || 0)}</strong></div>
            <div className="entity-stat-row"><span>Audio</span><strong>{formatNumber(modalityMix?.audio || 0)}</strong></div>
            <div className="entity-stat-row"><span>Video</span><strong>{formatNumber(modalityMix?.video || 0)}</strong></div>
          </div>
        </CardSection>
        <CardSection title="User Info" flush>
          <div className="entity-stats-list">
            <div className="entity-stat-row"><span>Email</span><strong>{profile?.email || '-'}</strong></div>
            <div className="entity-stat-row"><span>Client</span><strong>{profile?.clientName || '-'}</strong></div>
            <div className="entity-stat-row"><span>Environment</span><strong>{profile?.env || '-'}</strong></div>
            <div className="entity-stat-row"><span>Created</span><strong>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</strong></div>
          </div>
        </CardSection>
      </div>

      <div className="entity-detail-grid entity-detail-grid-even">
        <CardSection title="Twins Used" subtitle={`${twins?.length || 0} linked twins`} flush>
          {twins?.length ? (
            <div className="entity-list">
              {twins.map((twin) => (
                <EntityListRow
                  key={twin._id}
                  avatarClassName="twin"
                  initials={getInitials(twin.name || '')}
                  title={twin.name || 'Unnamed'}
                  subtitle={twin.role || ''}
                  onClick={() => navigate(`/twins/${twin._id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No twins used." />
          )}
        </CardSection>

        <CardSection title="Session History" flush>
          {sessionHistory?.length ? (
            <div className="entity-stats-list">
              {sessionHistory.map((session, i) => (
                <div key={session.sessionId || i} className="entity-stat-row">
                  <span>{session.twinName || 'Unknown'}</span>
                  <strong>{session.messages || 0} msgs · {session.duration || '-'}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyDetailState message="No session history." />
          )}
        </CardSection>
      </div>
    </section>
  );
}
