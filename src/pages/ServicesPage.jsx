import { useEffect, useState } from 'react';
import { dashboardService } from '../services';

const statusTone = {
  Configured: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Not Configured': 'border-amber-200 bg-amber-50 text-amber-700',
  Error: 'border-rose-200 bg-rose-50 text-rose-700',
  Unknown: 'border-slate-200 bg-slate-50 text-slate-600',
};
const statusDotTone = {
  Configured: 'bg-emerald-500',
  'Not Configured': 'bg-amber-500',
  Error: 'bg-rose-500',
  Unknown: 'bg-slate-400',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[status] || statusTone.Unknown}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotTone[status] || statusDotTone.Unknown}`} />
      {status}
    </span>
  );
}

function formatKeyName(key) {
  if (!key) return '';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSimpleValue(v) {
  if (v == null) return '-';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return v.toLocaleString('en-US');

  if (Array.isArray(v)) {
    if (v.length === 0) return 'None';
    const first = v[0];
    if (typeof first === 'object' && first !== null) {
      if ('total' in first && 'remaining' in first) {
        const total = Number(first.total || 0).toLocaleString();
        const rem = Number(first.remaining || 0).toLocaleString();
        return `${total} Total · ${rem} Remaining`;
      }
      if ('amount' in first) {
        const currency = (first.currency || 'usd').toUpperCase();
        const amt = (Number(first.amount || 0) / 100).toLocaleString('en-US', { style: 'currency', currency });
        return `${amt} ${currency}`;
      }
      if (first.name) return first.name;
      if (first.label) return first.label;
    }
    return v.map((item) => (typeof item === 'object' ? (item.name || item.id || JSON.stringify(item)) : String(item))).join(', ');
  }

  if (typeof v === 'object') {
    if ('bytes' in v && typeof v.bytes === 'number') {
      const num = v.bytes;
      if (num === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(num) / Math.log(k));
      return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
    if (v.storageUsed || v.bandwidthUsed) {
      return [v.storageUsed, v.bandwidthUsed].filter(Boolean).join(' · ');
    }
    if (v.name) return v.name;
    if (v.username) return v.username;
    return Object.entries(v).map(([k, val]) => `${formatKeyName(k)}: ${val}`).join(', ');
  }

  return String(v);
}

export function ServicesPage() {
  const [services, setServices] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const data = await dashboardService.getServicesStatus();
        if (!active) return;
        setServices(data?.data || data);
      } catch (err) {
        console.error('GET /config/services-status failed:', err);
        if (active) setServices(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const serviceList = services ? Object.entries(services).map(([name, info]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    key: name,
    status: info?.status || 'Unknown',
    data: info?.data || null,
    message: info?.message || null,
  })) : [];

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Services</h1>
          <p className="mt-1 text-sm text-slate-500">Third-party integration health and status</p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel sm:p-6">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true" />
            Checking service status...
          </div>
        ) : serviceList.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center text-sm font-medium text-slate-500">No services configured</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {serviceList.map((service) => (
              <article key={service.key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">{service.name}</h3>
                  <StatusBadge status={service.status} />
                </div>
                {service.message ? (
                  <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{service.message}</p>
                ) : null}
                {service.data ? (
                  <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                    {Object.entries(service.data).slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-4 text-sm">
                        <span className="shrink-0 font-medium text-slate-500">{formatKeyName(k)}</span>
                        <strong className="max-w-[65%] break-words text-right font-semibold text-slate-800">
                          {formatSimpleValue(v)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
