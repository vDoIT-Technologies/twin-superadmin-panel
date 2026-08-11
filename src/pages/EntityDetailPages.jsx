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
import { useAuth } from '../app/AuthContext';
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

const toneStyles = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
};

const avatarTone = {
  client: 'bg-blue-100 text-blue-600',
  twin: 'bg-purple-100 text-purple-600',
  user: 'bg-indigo-100 text-indigo-600',
};

function MetricCard({ icon: Icon, label, value, meta, tone = 'indigo' }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneStyles[tone] || toneStyles.indigo}`}>
          <Icon size={16} />
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
      {meta ? <span className="mt-1 block text-xs text-slate-400">{meta}</span> : null}
    </article>
  );
}

function DetailHeader({ avatarClassName, initials, title, subtitle, onBack }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900" onClick={onBack}>
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="flex min-w-0 items-center gap-3.5">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-bold shadow-sm ${avatarTone[avatarClassName] || avatarClassName}`}>{initials}</span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">{subtitle}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function CardSection({ title, subtitle, children, flush = false }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          {subtitle ? <span className="mt-0.5 block text-xs text-slate-400">{subtitle}</span> : null}
        </div>
      </div>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

function EntityListRow({ avatarClassName, initials, title, subtitle, meta, onClick }) {
  return (
    <button type="button" className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 text-left transition hover:bg-slate-50 last:border-b-0" onClick={onClick}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${avatarTone[avatarClassName] || avatarClassName}`}>{initials}</span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-semibold text-slate-800">{title}</strong>
          <span className="block truncate text-xs text-slate-400">{subtitle}</span>
        </span>
      </div>
      {meta ? <span className="shrink-0 text-xs font-medium text-slate-400">{meta}</span> : null}
    </button>
  );
}

function EmptyDetailState({ message }) {
  return <div className="py-12 text-center text-sm text-slate-400">{message}</div>;
}

function DetailPagination({ currentPage, itemCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(itemCount / DETAIL_PAGE_SIZE));
  const pageStart = itemCount === 0 ? 0 : (currentPage - 1) * DETAIL_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * DETAIL_PAGE_SIZE, itemCount);

  if (itemCount === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-sm text-slate-400">
      <span>{pageStart}-{pageEnd} of {itemCount}</span>
      <div className="flex items-center gap-2 font-medium text-slate-600">
        <button
          type="button"
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft size={14} />
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button
          type="button"
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
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
  const { adminProduct } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestedTab = searchParams.get('tab');
  const clientTabs = adminProduct === 'vault'
    ? ['overview', 'users', 'services', 'vault', 'timeline']
    : ['overview', 'twins', 'users', 'services', 'cost', 'timeline'];
  const initialTab = clientTabs.includes(requestedTab) ? requestedTab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

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
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!clientId || !activeTab) return undefined;
    if (['overview', 'services', 'cost', 'timeline'].includes(activeTab)) return undefined;

    if (tabData[activeTab] !== null) return undefined;

    let isActive = true;
    setTabLoading(activeTab);

    const fetchers = {
      twins: () => dashboardService.getEntityClientTwins(clientId),
      users: () => dashboardService.getEntityClientUsers(clientId),
      vault: () => dashboardService.getEntityClientVault(clientId),
    };

    const fetcher = fetchers[activeTab];
    if (!fetcher) return undefined;

    fetcher()
      .then((response) => {
        if (!isActive) return;
        const payload = response?.data || response;
        setTabData((prev) => ({ ...prev, [activeTab]: payload }));
      })
      .catch((error) => {
        console.error(`GET client ${activeTab} tab failed:`, error);
        if (isActive) setTabData((prev) => ({ ...prev, [activeTab]: [] }));
      })
      .finally(() => {
        if (isActive) setTabLoading('');
      });

    return () => { isActive = false; };
  }, [activeTab, clientId, tabData]);

  if (isLoading) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Loading client...</div>
      </section>
    );
  }

  if (!clientData) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Client not found.</div>
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
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <DetailHeader
        avatarClassName="client"
        initials={getInitials(clientName)}
        title={clientName}
        subtitle={`${profile?.organizationName || ''} · ${plan} plan`}
        onBack={() => navigate(location.state?.from || '/clients')}
      />

      {adminProduct === 'vault' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Users} label="Vault users" value={String(kpis?.usersCount || kpis?.activeDrives || 0)} tone="indigo" />
          <MetricCard icon={Activity} label="Active drives" value={String(kpis?.activeDrives || 0)} tone="emerald" />
          <MetricCard icon={BookOpen} label="Files stored" value={formatNumber(kpis?.totalFiles || 0)} tone="sky" />
          <MetricCard icon={TrendingUp} label="Storage used" value={formatBytes(kpis?.storedOnIpfsBytes || 0)} tone="violet" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Wallet} label="COGS" value={formatCurrency(kpis?.cost || 0)} tone="indigo" />
          <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(kpis?.revenue || 0)} tone="emerald" />
          <MetricCard icon={Percent} label="Margin" value={`${kpis?.margin || 0}%`} tone="violet" />
          <MetricCard icon={Bot} label="Twins" value={String(kpis?.twinsCount || 0)} tone="rose" />
          <MetricCard icon={Users} label="Users" value={String(kpis?.usersCount || 0)} tone="amber" />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold capitalize transition ${activeTab === tab ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            onClick={() => selectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSection title="Client info" flush>
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Name</span><strong className="font-semibold text-slate-700">{clientName || '-'}</strong></div>
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Organization</span><strong className="font-semibold text-slate-700">{profile?.organizationName || '-'}</strong></div>
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Email</span><strong className="font-semibold text-slate-700">{profile?.email || '-'}</strong></div>
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Plan</span><strong className="font-semibold text-slate-700">{plan || '-'}</strong></div>
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Environment</span><strong className="font-semibold text-slate-700">{profile?.env || '-'}</strong></div>
              <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Created</span><strong className="font-semibold text-slate-700">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</strong></div>
            </div>
          </CardSection>
          <CardSection title={adminProduct === 'vault' ? 'Vault summary' : 'Usage summary'} flush>
            <div className="divide-y divide-slate-100">
              {adminProduct === 'vault' ? (
                <>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Active drives</span><strong className="font-semibold text-slate-700">{formatNumber(kpis?.activeDrives || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Files stored</span><strong className="font-semibold text-slate-700">{formatNumber(kpis?.totalFiles || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Storage used</span><strong className="font-semibold text-slate-700">{formatBytes(kpis?.storedOnIpfsBytes || 0)}</strong></div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Total tokens</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.tokens || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Prompt tokens</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.promptTokens || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Completion tokens</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.completionTokens || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Audio seconds</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.audioSeconds || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">API calls</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.apiCalls || 0)}</strong></div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Usage cost</span><strong className="font-semibold text-slate-700">{formatCurrency(usage?.cost || 0)}</strong></div>
                </>
              )}
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
            <div className="w-full text-xs">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3 font-bold uppercase tracking-wider text-slate-400">
                <span className="flex-1">Twin</span>
                <span className="w-28 text-right">Est. Cost</span>
                <span className="w-20 text-right">Share</span>
              </div>
              {paginatedTwins.map((twin) => (
                <div
                  key={twin._id}
                  className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-5 py-3.5 transition hover:bg-slate-50"
                  onClick={() => navigate(`/twins/${twin._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/twins/${twin._id}`)}
                >
                  <span className="flex flex-1 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-purple-100 text-xs font-bold text-purple-600">{getInitials(twin.name || '')}</span>
                    <span>
                      <strong className="block text-sm font-semibold text-slate-800">{twin.name || 'Unnamed'}</strong>
                      {twin.role ? <span className="block text-xs text-slate-400">{twin.role}</span> : null}
                    </span>
                  </span>
                  <span className="w-28 text-right font-medium text-slate-600">{formatCurrency(twin.estCost || 0)}</span>
                  <span className="w-20 text-right font-medium text-slate-600">{twin.share || 0}%</span>
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
            <div className="w-full text-xs">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3 font-bold uppercase tracking-wider text-slate-400">
                <span className="flex-1">User</span>
                <span className="w-20">Env</span>
                <span className="w-24 text-right">Points</span>
                {adminProduct !== 'vault' ? <span className="w-24 text-right">Twins used</span> : null}
                <span className="w-24 text-right">Last active</span>
              </div>
              {paginatedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-5 py-3.5 transition hover:bg-slate-50"
                  onClick={() => navigate(`/users/${user._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/users/${user._id}`)}
                >
                  <span className="flex flex-1 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-600">{getInitials(user.name || '')}</span>
                    <span>
                      <strong className="block text-sm font-semibold text-slate-800">{user.name || 'Unnamed'}</strong>
                      <span className="block text-xs text-slate-400">{user.email || ''}</span>
                    </span>
                  </span>
                  <span className="w-20">{envBadge(user.env)}</span>
                  <span className="w-24 text-right font-medium text-slate-600">{formatNumber(parseDecimal(user.points))}</span>
                  {adminProduct !== 'vault' ? <span className="w-24 text-right font-medium text-slate-600">{user.twinsUsed || 0}</span> : null}
                  <span className="w-24 text-right font-medium text-slate-400">{formatDateShort(user.lastActive)}</span>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
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
            <div className="w-full text-xs">
              <div className="flex items-center justify-between bg-slate-50 px-5 py-3 font-bold uppercase tracking-wider text-slate-400">
                <span className="flex-1">User / drive</span><span className="w-28 text-right">Storage</span><span className="w-28 text-right">Limit</span><span className="w-24 text-right">Files</span><span className="w-28 text-right">Last active</span>
              </div>
              {paginatedVault.map((drive, index) => (
                <div key={drive._id || drive.userId || index} className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 transition hover:bg-slate-50">
                  <span className="flex-1 font-semibold text-slate-800">{drive.name || drive.userName || drive.email || drive.vaultId || 'Vault drive'}</span>
                  <span className="w-28 text-right font-semibold text-slate-700">{formatBytes(drive.storageUsed || 0)}</span>
                  <span className="w-28 text-right text-slate-500">{formatBytes(drive.storageLimit || 0)}</span>
                  <span className="w-24 text-right text-slate-500">{formatNumber(drive.filesCount || 0)}</span>
                  <span className="w-28 text-right text-slate-400">{formatDateShort(drive.lastActive || drive.updatedAt)}</span>
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

  if (isLoading) return <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Loading twin...</div></section>;
  if (!twinData) return <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Twin not found.</div></section>;

  const { profile, kpis, usage } = twinData;

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <DetailHeader
        avatarClassName="twin"
        initials={getInitials(profile?.name || '')}
        title={profile?.name || 'Unnamed'}
        subtitle={`${profile?.role || ''} · ${profile?.clientName || ''}`}
        onBack={() => navigate('/twins')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={MessagesSquare} label="Messages" value={formatNumber(kpis?.messages || 0)} tone="indigo" />
        <MetricCard icon={Wallet} label="Cost" value={formatCurrency(kpis?.cost || 0)} tone="rose" />
        <MetricCard icon={TrendingUp} label="Revenue" value={formatCurrency(kpis?.revenue || 0)} tone="emerald" />
        <MetricCard icon={BookOpen} label="Knowledge Sources" value={formatNumber(kpis?.knowledgeSources || 0)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardSection title="Twin Info" flush>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Name</span><strong className="font-semibold text-slate-700">{profile?.name || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Role</span><strong className="font-semibold text-slate-700">{profile?.role || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Client</span><strong className="font-semibold text-slate-700">{profile?.clientName || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Created</span><strong className="font-semibold text-slate-700">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</strong></div>
          </div>
        </CardSection>
        <CardSection title="Usage Summary" flush>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Total Tokens</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.tokens || 0)}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Prompt Tokens</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.promptTokens || 0)}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Completion Tokens</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.completionTokens || 0)}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">API Calls</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.apiCalls || 0)}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Audio Seconds</span><strong className="font-semibold text-slate-700">{formatNumber(usage?.audioSeconds || 0)}</strong></div>
          </div>
        </CardSection>
      </div>
    </section>
  );
}

export function UserDetailPage() {
  const { adminProduct } = useAuth();
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

  if (isLoading) return <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">Loading user...</div></section>;
  if (!userData) return <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 shadow-panel">User not found.</div></section>;

  const { profile, kpis, modalityMix, twins, sessionHistory } = userData;

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={MessagesSquare} label="Messages" value={formatNumber(kpis?.messages || 0)} tone="indigo" />
        <MetricCard icon={Activity} label="Sessions" value={formatNumber(kpis?.sessions || 0)} tone="sky" />
        <MetricCard icon={Coins} label="Points Balance" value={formatNumber(kpis?.pointsBalance || 0)} tone="amber" />
        <MetricCard icon={Wallet} label="Spend Value" value={formatCurrency(kpis?.spendValue || 0)} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CardSection title="Modality Mix" subtitle={`${formatNumber(kpis?.messages || 0)} messages`} flush>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Text</span><strong className="font-semibold text-slate-700">{formatNumber(modalityMix?.text || 0)}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Audio</span><strong className="font-semibold text-slate-700">{formatNumber(modalityMix?.audio || 0)}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Video</span><strong className="font-semibold text-slate-700">{formatNumber(modalityMix?.video || 0)}</strong></div>
          </div>
        </CardSection>
        <CardSection title="User Info" flush>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Email</span><strong className="font-semibold text-slate-700">{profile?.email || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Client</span><strong className="font-semibold text-slate-700">{profile?.clientName || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Environment</span><strong className="font-semibold text-slate-700">{profile?.env || '-'}</strong></div>
            <div className="flex items-center justify-between px-5 py-3 text-xs"><span className="text-slate-400">Created</span><strong className="font-semibold text-slate-700">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</strong></div>
          </div>
        </CardSection>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${adminProduct === 'vault' ? '' : 'lg:grid-cols-2'}`}>
        {adminProduct !== 'vault' ? <CardSection title="Twins Used" subtitle={`${twins?.length || 0} linked twins`} flush>
          {twins?.length ? (
            <div>
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
        </CardSection> : null}

        <CardSection title="Session History" flush>
          {sessionHistory?.length ? (
            <div className="divide-y divide-slate-100">
              {sessionHistory.map((session, i) => (
                <div key={session.sessionId || i} className="flex items-center justify-between px-5 py-3 text-xs">
                  <span className="text-slate-400">{adminProduct === 'vault' ? `Session ${i + 1}` : session.twinName || 'Unknown'}</span>
                  <strong className="font-semibold text-slate-700">{session.messages || 0} msgs · {session.duration || '-'}</strong>
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
