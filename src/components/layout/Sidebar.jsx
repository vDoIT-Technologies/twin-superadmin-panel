import { NavLink } from 'react-router-dom';
import { Activity, Bot, Boxes, Building2, Database, LayoutDashboard, ScrollText, Users, Wallet } from 'lucide-react';

const NAV_GROUPS = [
  { label: 'Monitor', items: [
    { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
    { to: '/services', label: 'Services', icon: Boxes },
    { to: '/vault', label: 'Vault', icon: Database },
  ] },
  { label: 'Entities', items: [
    { to: '/clients', label: 'Clients', icon: Building2 },
    { to: '/twins', label: 'Twins', icon: Bot },
    { to: '/users', label: 'Users', icon: Users },
  ] },
  { label: 'Financials', items: [
    { to: '/financial', label: 'Cost & Billing', icon: Wallet },
    { to: '/usage', label: 'Usage Analytics', icon: Activity },
  ] },
  { label: 'System', items: [
    { to: '/telemetry', label: 'Telemetry / Logs', icon: ScrollText },
  ] },
];

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Twin Protocol logo">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Sidebar({ collapsed, initials, profileName, profileEmail }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="brand-block">
        <BrandMark />
        <div className="brand-copy"><p className="brand-name">Twin Protocol</p><p className="brand-kicker">SuperAdmin</p></div>
      </div>
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            <p className="nav-group-label">{group.label}</p>
            <div className="nav-group-items">
              {group.items.map(({ icon: Icon, ...item }) => (
                <NavLink key={item.to} end={item.end} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  <span className="nav-icon"><Icon size={18} /></span><span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-profile">
        <div className="avatar-badge">{initials}</div>
        <div className="profile-copy"><p className="profile-name">{profileName}</p><p className="profile-email">{profileEmail}</p></div>
      </div>
    </aside>
  );
}
