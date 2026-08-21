import { Activity, Bot, Boxes, Building2, Database, LayoutDashboard, Package, ScrollText, Users, Wallet } from "lucide-react";

export function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Twin Protocol logo">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export const NAV_GROUPS_BY_ROLE = {
  twin: [
    { label: 'Monitor', items: [
      { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
      { to: '/services', label: 'Services', icon: Boxes },
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
  ],
  vault: [
    { label: 'Monitor', items: [
      { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
      { to: '/services', label: 'Services', icon: Boxes },
      { to: '/vault', label: 'Vault', icon: Database },
    ] },
    { label: 'Entities', items: [
      { to: '/clients', label: 'Clients', icon: Building2 },
      { to: '/users', label: 'Users', icon: Users },
    ] },
    { label: 'Plans', items: [
      { to: '/plans', label: 'Plans', icon: Package },
    ] },
    { label: 'Financials', items: [
      { to: '/financial', label: 'Vault Billing', icon: Wallet },
      { to: '/usage', label: 'Vault Usage Analytics', icon: Activity },
    ] },
    { label: 'System', items: [
      { to: '/telemetry', label: 'Health & Logs', icon: ScrollText },
    ] },
  ],
  default: [
    { label: 'Monitor', items: [
      { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
    ] },
  ],
};
