import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useContext, useMemo } from 'react';
import { FilterContext } from '../app/FilterContext';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { superadminDemoData } from '../demo-data/superadminDemoData';
import {
  LayoutDashboard,
  Boxes,
  Building2,
  Bot,
  Users,
  Wallet,
  Activity,
  ScrollText,
  Search,
  Bell,
  Columns2,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', end: true, icon: <LayoutDashboard size={18} /> },
      { to: '/services', label: 'Services', icon: <Boxes size={18} /> },
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
    label: 'Analytics',
    items: [
      { to: '/financial', label: 'Cost', icon: <Wallet size={18} /> },
      { to: '/usage', label: 'Usage', icon: <Activity size={18} /> },
      { to: '/telemetry', label: 'Telemetry', icon: <ScrollText size={18} /> },
    ],
  },
];

const breadcrumbTitles = {
  '/': 'Overview',
  '/clients': 'Clients',
  '/twins': 'Twins',
  '/users': 'Users',
  '/services': 'Services',
  '/financial': 'Cost',
  '/usage': 'Usage',
  '/telemetry': 'Telemetry',
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

export function AppLayout() {
  const location = useLocation();
  const { filters, setFilters } = useContext(FilterContext);
  const currentTitle = breadcrumbTitles[location.pathname] ?? 'Overview';

  const updateFilters = (partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const twinOptions = useMemo(
    () => superadminDemoData.TWINS.filter((twin) => !filters.client || twin.clientId === filters.client),
    [filters.client],
  );
  const userOptions = useMemo(
    () => superadminDemoData.USERS.filter((user) => !filters.client || user.clientId === filters.client),
    [filters.client],
  );
  const vendorOptions = useMemo(
    () =>
      superadminDemoData.VENDORS.filter(
        (vendor) => !filters.service || superadminDemoData.byId.service(filters.service)?.vendors.includes(vendor.id),
      ),
    [filters.service],
  );
  const clientDropdownOptions = useMemo(
    () =>
      superadminDemoData.CLIENTS.map((client) => ({
        value: client.id,
        label: client.name,
        meta: client.plan,
      })),
    [],
  );
  const twinDropdownOptions = useMemo(
    () =>
      twinOptions.map((twin) => ({
        value: twin.id,
        label: twin.name,
        meta: superadminDemoData.byId.client(twin.clientId)?.name ?? '',
      })),
    [twinOptions],
  );
  const userDropdownOptions = useMemo(
    () =>
      userOptions.map((user) => ({
        value: user.id,
        label: user.name,
        meta: superadminDemoData.byId.client(user.clientId)?.name ?? '',
      })),
    [userOptions],
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
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
          <div>
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
          <div className="avatar-badge">SA</div>
          <div>
            <p className="profile-name">Super Admin</p>
            <p className="profile-email">admin@twinprotocol.dev</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-root">Twin Protocol</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{currentTitle}</span>
          </div>

          <div className="topbar-actions">
            <label className="search-shell">
              <Search className="search-icon" size={16} />
              <input type="text" placeholder="Search clients, twins, users..." />
            </label>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={16} />
            </button>
            <div className="avatar-badge compact">SA</div>
          </div>
        </header>

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
                className={`filter-chip${filters.lens === lens.id ? ' active' : ''}`}
                onClick={() => updateFilters({ lens: lens.id })}
              >
                {lens.label}
              </button>
            ))}
          </div>
        </div>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
