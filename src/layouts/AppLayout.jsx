import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { FilterContext } from '../app/FilterContext';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import {
  dropdownApiAvailable,
  getClientsDropdown,
  getTwinsDropdown,
  getUsersDropdown,
} from '../services';
import {
  LayoutDashboard,
  Boxes,
  Database,
  Building2,
  Bot,
  Users,
  Wallet,
  Activity,
  ScrollText,
  Search,
  Bell,
  Columns2,
  CornerDownLeft,
  ChevronDown,
  LogOut,
  UserCircle2,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', end: true, icon: <LayoutDashboard size={18} /> },
      { to: '/services', label: 'Services', icon: <Boxes size={18} /> },
      { to: '/vault', label: 'Vault', icon: <Database size={18} /> },
    ],
  },
  {
    label: 'Entities',
    items: [
      { to: '/clients', label: 'Clients', icon: <Building2 size={18} /> },
      { to: '/twins', label: 'Twins', icon: <Bot size={18} /> },
      { to: '/users', label: 'Users', icon: <Users size={18} /> },
    ],
  },
  {
    label: 'Financials',
    items: [
      { to: '/financial', label: 'Cost & Billing', icon: <Wallet size={18} /> },
      { to: '/usage', label: 'Usage Analytics', icon: <Activity size={18} /> },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/telemetry', label: 'Telemetry / Logs', icon: <ScrollText size={18} /> },
    ],
  },
];

const breadcrumbTitles = {
  '/': 'Overview',
  '/clients': 'Clients',
  '/twins': 'Twins',
  '/users': 'Users',
  '/services': 'Services',
  '/vault': 'Vault',
  '/financial': 'Cost & Billing',
  '/usage': 'Usage Analytics',
  '/telemetry': 'Telemetry / Logs',
  '/profile': 'Profile',
};

const envOptions = [
  { id: 'dev', label: 'Dev', color: '#64748b' },
  { id: 'staging', label: 'Staging', color: '#0ea5e9' },
  { id: 'prod', label: 'Prod', color: '#4f46e5' },
];

const rangeOptions = ['24h', '7d', '30d', '90d'];
const granOptions = ['day', 'week', 'month'];
const lensOptions = [
  { id: 'cost', label: 'Cost' },
  { id: 'usage', label: 'Usage' },
  { id: 'economy', label: 'Economy' },
];

const invalidUserNames = new Set([
  '',
  '-',
  '?',
  '-?',
  'n/a',
  'na',
  'null',
  'undefined',
]);

function getUserName(user) {
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return invalidUserNames.has(name.toLowerCase()) ? '' : name;
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, profile, user } = useAuth();
  const { filters, setFilters } = useContext(FilterContext);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [twins, setTwins] = useState([]);
  const [users, setUsers] = useState([]);
  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);
  const showFilterBar = location.pathname !== '/profile';
  const currentTitle =
    breadcrumbTitles[location.pathname] ??
    (location.pathname.startsWith('/clients/')
      ? 'Clients'
      : location.pathname.startsWith('/twins/')
        ? 'Twins'
        : location.pathname.startsWith('/users/')
          ? 'Users'
          : 'Overview');
  const profileName = profile.name || user?.name || 'Super Admin';
  const profileEmail = profile.email || user?.email || 'No email';
  const initials =
    profileName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'SA';

  const updateFilters = (partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const selectedEnv =
    filters.envs.length === 1 ? filters.envs[0] : undefined;

  useEffect(() => {
    if (!isAuthenticated || !dropdownApiAvailable()) {
      return undefined;
    }

    let active = true;

    getClientsDropdown({ env: selectedEnv })
      .then((data) => {
        if (active) setClients(data);
      })
      .catch((error) => {
        console.error('[AppLayout] Failed to load clients:', error);
        if (active) setClients([]);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, selectedEnv]);

  useEffect(() => {
    if (!isAuthenticated || !dropdownApiAvailable()) {
      return undefined;
    }

    let active = true;

    getTwinsDropdown({
      env: selectedEnv,
      clientId: filters.client,
    })
      .then((data) => {
        if (active) setTwins(data);
      })
      .catch((error) => {
        console.error('[AppLayout] Failed to load twins:', error);
        if (active) setTwins([]);
      });

    return () => {
      active = false;
    };
  }, [filters.client, isAuthenticated, selectedEnv]);

  useEffect(() => {
    if (!isAuthenticated || !dropdownApiAvailable()) {
      return undefined;
    }

    let active = true;

    getUsersDropdown({
      env: selectedEnv,
      clientId: filters.client,
    })
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch((error) => {
        console.error('[AppLayout] Failed to load users:', error);
        if (active) setUsers([]);
      });

    return () => {
      active = false;
    };
  }, [filters.client, isAuthenticated, selectedEnv]);

  const vendorOptions = useMemo(
    () =>
      superadminDemoData.VENDORS.filter(
        (vendor) => !filters.service || superadminDemoData.byId.service(filters.service)?.vendors.includes(vendor.id),
      ),
    [filters.service],
  );
  const clientDropdownOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id ?? client._id ?? client.value,
        label: client.name ?? client.label,
        meta: client.plan ?? '',
      })),
    [clients],
  );
  const twinDropdownOptions = useMemo(
    () =>
      twins.map((twin) => ({
        value: twin.id ?? twin._id ?? twin.value,
        label: twin.name ?? twin.label,
        meta: twin.clientName ?? twin.client?.name ?? '',
      })),
    [twins],
  );
  const userDropdownOptions = useMemo(
    () =>
      users.map((user) => {
        const name = getUserName(user);

        return {
          value: user.id ?? user._id ?? user.value,
          label: name || user.email || user.label || 'Unknown user',
        };
      }),
    [users],
  );
  const serviceDropdownOptions = useMemo(
    () =>
      superadminDemoData.SERVICES.map((service) => ({
        value: service.id,
        label: service.name,
        meta: service.stack,
      })),
    [],
  );
  const vendorDropdownOptions = useMemo(
    () =>
      vendorOptions.map((vendor) => ({
        value: vendor.id,
        label: vendor.name,
        meta: vendor.cat,
      })),
    [vendorOptions],
  );
  const granDropdownOptions = useMemo(
    () =>
      granOptions.map((gran) => ({
        value: gran,
        label: `by ${gran}`,
      })),
    [],
  );

  const updateScopeFilter = (key, value) => {
    if (key === 'client') {
      updateFilters({ client: value, twin: null, user: null });
      return;
    }

    if (key === 'service') {
      updateFilters({ service: value, vendor: null });
      return;
    }

    updateFilters({ [key]: value });
  };

  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const clients = superadminDemoData.CLIENTS.filter((client) => client.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((client) => ({
        key: `client-${client.id}`,
        type: 'client',
        id: client.id,
        name: client.name,
        sub: client.plan,
        icon: <Building2 size={14} />,
        path: `/clients/${client.id}`,
      }));

    const twins = superadminDemoData.TWINS.filter((twin) => twin.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((twin) => ({
        key: `twin-${twin.id}`,
        type: 'twin',
        id: twin.id,
        name: twin.name,
        sub: superadminDemoData.byId.client(twin.clientId)?.name ?? '',
        icon: <Bot size={14} />,
        path: `/twins/${twin.id}`,
      }));

    const users = superadminDemoData.USERS.filter((user) => user.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((user) => ({
        key: `user-${user.id}`,
        type: 'user',
        id: user.id,
        name: user.name,
        sub: superadminDemoData.byId.client(user.clientId)?.name ?? '',
        icon: <Users size={14} />,
        path: `/users/${user.id}`,
      }));

    return [...clients, ...twins, ...users];
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }

      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchQuery('');
    setSearchOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const openSearch = () => {
    if (searchQuery.trim()) {
      setSearchOpen(true);
    }
  };

  const selectSearchHit = (hit) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(hit.path);
  };

  const handleProfileAction = (path) => {
    setProfileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar${isSidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="brand-block">
          <div className="brand-mark" aria-label="Twin Protocol logo">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 12.5 11 14l3.5-4"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="brand-copy">
            <p className="brand-name">Twin Protocol</p>
            <p className="brand-kicker">SuperAdmin</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-group-label">{group.label}</p>
              <div className="nav-group-items">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    end={item.end}
                    to={item.to}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-profile">
          <div className="avatar-badge">{initials}</div>
          <div className="profile-copy">
            <p className="profile-name">{profileName}</p>
            <p className="profile-email">{profileEmail}</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <div className="workspace-chrome">
          <header className="topbar">
            <div className="topbar-title-group">
              <button
                className="icon-button topbar-toggle"
                type="button"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-pressed={isSidebarCollapsed}
                onClick={() => setIsSidebarCollapsed((value) => !value)}
              >
                <Columns2 size={16} />
              </button>
              <div className="breadcrumb">
                <span className="breadcrumb-current">{currentTitle}</span>
              </div>
            </div>

            <div className="topbar-actions">
              <div className="search-shell" ref={searchRef}>
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  placeholder="Search clients, twins, users..."
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setSearchQuery(nextQuery);
                    setSearchOpen(Boolean(nextQuery.trim()));
                  }}
                  onFocus={openSearch}
                />
                {searchOpen ? (
                  <div className="search-results" role="listbox" aria-label="Global search results">
                    {searchHits.length ? (
                      searchHits.map((hit) => (
                        <button
                          key={hit.key}
                          type="button"
                          className="search-result-button"
                          onClick={() => selectSearchHit(hit)}
                        >
                          <span className="search-result-icon">{hit.icon}</span>
                          <span className="search-result-copy">
                            <span className="search-result-name">{hit.name}</span>
                            <span className="search-result-meta">
                              {hit.type} · {hit.sub}
                            </span>
                          </span>
                          <CornerDownLeft size={14} className="search-result-enter" />
                        </button>
                      ))
                    ) : (
                      <div className="search-results-empty">No matches for "{searchQuery.trim()}"</div>
                    )}
                  </div>
                ) : null}
              </div>
              <button className="icon-button" type="button" aria-label="Notifications">
                <Bell size={16} />
              </button>
              <div className="profile-menu-shell" ref={profileMenuRef}>
                <button
                  className="profile-menu-trigger"
                  type="button"
                  aria-label="Open profile menu"
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((value) => !value)}
                >
                  <div className="avatar-badge compact">{initials}</div>
                  <ChevronDown size={14} className="profile-menu-caret" />
                </button>
                {profileMenuOpen ? (
                  <div className="profile-menu-dropdown">
                    <button type="button" className="profile-menu-item" onClick={() => handleProfileAction('/profile')}>
                      <UserCircle2 size={15} />
                      <span>Profile</span>
                    </button>
                    <button type="button" className="profile-menu-item danger" onClick={handleLogout}>
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {showFilterBar ? (
            <>
              <div className="filterbar">
                <div className="filter-group">
                  <span className="filter-label">Env</span>
                  {envOptions.map((option) => {
                    const active = filters.envs.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`filter-chip filter-chip-env filter-chip-env-${option.id}${active ? ' active' : ''}`}
                        onClick={() => {
                          const next = active
                            ? filters.envs.filter((id) => id !== option.id)
                            : [...filters.envs, option.id];
                          if (next.length === 0) return;
                          updateFilters({ envs: next });
                        }}
                      >
                        <span className="filter-chip-dot" aria-hidden="true" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="filter-group">
                  {rangeOptions.map((range) => (
                    <button
                      key={range}
                      type="button"
                      className={`filter-chip${filters.range === range ? ' active' : ''}`}
                      onClick={() => updateFilters({ range })}
                    >
                      {range}
                    </button>
                  ))}
                </div>

                <div className="filter-group">
                  <FilterDropdown
                    value={filters.gran}
                    onChange={(value) => updateFilters({ gran: value ?? 'day' })}
                    options={granDropdownOptions}
                    placeholder="by day"
                    searchable={false}
                  />
                </div>

                <div className="filter-group">
                  <FilterDropdown
                    value={filters.client}
                    onChange={(value) => updateScopeFilter('client', value)}
                    options={clientDropdownOptions}
                    placeholder="All clients"
                    searchPlaceholder="Search client..."
                  />
                </div>

                <div className="filter-group">
                  <FilterDropdown
                    value={filters.twin}
                    onChange={(value) => updateScopeFilter('twin', value)}
                    options={twinDropdownOptions}
                    placeholder="All twins"
                    searchPlaceholder="Search twin..."
                  />
                </div>

                <div className="filter-group">
                  <FilterDropdown
                    value={filters.user}
                    onChange={(value) => updateScopeFilter('user', value)}
                    options={userDropdownOptions}
                    placeholder="All users"
                    searchPlaceholder="Search user..."
                  />
                </div>

                <div className="filter-group">
                  <FilterDropdown
                    value={filters.service}
                    onChange={(value) => updateScopeFilter('service', value)}
                    options={serviceDropdownOptions}
                    placeholder="All services"
                    searchPlaceholder="Search service..."
                  />
                </div>

                <div className="filter-group">
                  <FilterDropdown
                    value={filters.vendor}
                    onChange={(value) => updateScopeFilter('vendor', value)}
                    options={vendorDropdownOptions}
                    placeholder="All vendors"
                    searchPlaceholder="Search vendor..."
                    align="right"
                  />
                </div>

                <div className="filter-group filter-group-spacer" />

                <div className="filter-group">
                  <button
                    type="button"
                    className={`filter-chip filter-chip-compare${filters.compare ? ' active' : ''}`}
                    onClick={() => updateFilters({ compare: !filters.compare })}
                  >
                    <Columns2 size={15} />
                    Compare
                  </button>
                </div>
              </div>

              <div className="filterbar filterbar-secondary">
                <div className="filter-group filter-group-lens">
                  {lensOptions.map((lens) => (
                    <button
                      key={lens.id}
                      type="button"
                      className={`filter-chip filter-chip-lens${filters.lens === lens.id ? ' active' : ''}`}
                      onClick={() => updateFilters({ lens: lens.id })}
                    >
                      {lens.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
