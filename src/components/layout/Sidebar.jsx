import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../../app/AuthContext';
import { BrandMark, NAV_GROUPS_BY_ROLE } from './Nav';

export function Sidebar({ collapsed, mobileOpen, onNavigate, initials, profileName, profileEmail }) {
  const { profile } = useAuth();
  const roleName = profile?.role?.name;
  const visibleNavGroups = useMemo(
    () => NAV_GROUPS_BY_ROLE[roleName] ?? NAV_GROUPS_BY_ROLE.default,
    [roleName],
  );

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="brand-block">
        <BrandMark />
        <div className="brand-copy"><p className="brand-name">{ profile?.role?.name =='twin' ? 'Twin Protocol' : 'Vault'}</p><p className="brand-kicker">SuperAdmin</p></div>
      </div>
      <nav className="sidebar-nav">
        {visibleNavGroups.map((group) => (
          <div key={group.label} className="nav-group">
            <p className="nav-group-label">{group.label}</p>
            <div className="nav-group-items">
              {group.items.map(({ icon: Icon, ...item }) => (
                <NavLink key={item.to} end={item.end} to={item.to} onClick={onNavigate} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
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
