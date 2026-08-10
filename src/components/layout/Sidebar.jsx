import { NavLink } from 'react-router-dom';
import { Activity, Bot, Boxes, Building2, Database, LayoutDashboard, ScrollText, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';

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
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20" aria-label="Twin Protocol logo">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Sidebar({ collapsed, mobileOpen, onNavigate, initials, profileName, profileEmail }) {
  const { profile } = useAuth();
  const brandTitle = profile?.role?.name === 'twin' ? 'Twin Protocol' : profile?.role?.name === 'vault' ? 'Vault Protocol' : 'Twin Protocol';

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white px-3 py-4 shadow-panel transition-[width,transform] duration-200 lg:sticky lg:z-10 lg:h-screen lg:translate-x-0 lg:shadow-none ${collapsed ? ' lg:w-20' : ''}${mobileOpen ? ' translate-x-0 shadow-2xl' : ' -translate-x-full'}`}>
      <div className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-2 pb-3">
        <BrandMark />
        <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="truncate text-base font-bold text-slate-800">{brandTitle}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">SuperAdmin</p>
        </div>
      </div>
      <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className={`mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ icon: Icon, ...item }) => (
                <NavLink key={item.to} end={item.end} to={item.to} onClick={onNavigate} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-xl px-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800${isActive ? ' bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-100' : ''}`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={18} /></span><span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-xs font-bold text-white shadow-xs">{initials}</div>
        <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}><p className="truncate text-sm font-semibold text-slate-700">{profileName}</p><p className="truncate text-xs text-slate-400">{profileEmail}</p></div>
      </div>
    </aside>
  );
}
