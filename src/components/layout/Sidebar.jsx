import { NavLink } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { BrandMark, NAV_GROUPS_BY_ROLE } from './Nav';
import { getProductLabel } from '../../utils/productAccess';

export function Sidebar({ collapsed, mobileOpen, onNavigate, initials, profileName, profileEmail }) {
  const { adminProduct } = useAuth();
  const navGroups = NAV_GROUPS_BY_ROLE[adminProduct] ?? NAV_GROUPS_BY_ROLE.default;
  const brandTitle = getProductLabel(adminProduct);

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
        {navGroups?.map((group) => (
          <div key={group.label}>
            <p className={`mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ icon: Icon, ...item }) => (
                <NavLink key={item.to} end={item.end} to={item.to} onClick={onNavigate} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-xl px-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800${isActive ? (adminProduct === 'vault' ? ' bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-inset ring-emerald-100' : ' bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-100') : ''}`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={18} /></span><span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-xs ${adminProduct === 'vault' ? 'from-emerald-600 to-teal-500' : 'from-indigo-600 to-indigo-500'}`}>{initials}</div>
        <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}><p className="truncate text-sm font-semibold text-slate-700">{profileName}</p><p className="truncate text-xs text-slate-400">{profileEmail}</p></div>
      </div>
    </aside>
  );
}
