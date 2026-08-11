import { useEffect, useState } from 'react';
import { AlertCircle, Clock3, RefreshCw } from 'lucide-react';
import { dashboardService } from '../services';
import { useAuth } from '../app/AuthContext';

const VAULT_SERVICE_PATTERN = /vault|filebase|ipfs|storage|object.?store|s3/i;
const VAULT_ONLY_SERVICE_PATTERN = /vault|filebase|ipfs|storage|object.?store/i;

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
  const { adminProduct } = useAuth();
  const [services, setServices] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    async function load() {
      try {
        const data = await dashboardService.getServicesStatus();
        if (!active) return;
        setServices(data?.data || data);
        setLastChecked(new Date());
      } catch (err) {
        console.error('GET /config/services-status failed:', err);
        if (active) {
          setServices(null);
          setError(err?.message || 'Service status could not be loaded.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [reloadKey]);

  const serviceList = services ? Object.entries(services)
    .filter(([name]) => adminProduct === 'vault' ? VAULT_SERVICE_PATTERN.test(name) : !VAULT_ONLY_SERVICE_PATTERN.test(name))
    .map(([name, info]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    key: name,
    status: info?.status || 'Unknown',
    data: info?.data || null,
    message: info?.message || null,
    })) : [];

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Services</h1>
          <p className="mt-1 text-sm text-slate-500">{adminProduct === 'vault' ? 'Integration health and configuration for services used by Vault' : 'Third-party integration health and status'}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"><Clock3 size={13} />Checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : null}
          <button type="button" disabled={isLoading} onClick={() => setReloadKey((value) => value + 1)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />Refresh</button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel sm:p-6">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true" />
            Checking service status...
          </div>
        ) : error ? (
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle size={20} /></span>
            <h2 className="mt-3 text-sm font-semibold text-slate-800">Unable to check services</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">{error}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"><RefreshCw size={14} />Try again</button>
          </div>
        ) : serviceList.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center text-sm font-medium text-slate-500">No services configured</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {serviceList.map((service) => (
              <article key={service.key} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm">
                <span className={`absolute inset-y-0 left-0 w-1 ${service.status === 'Configured' ? 'bg-emerald-500' : service.status === 'Error' ? 'bg-rose-500' : 'bg-amber-400'}`} aria-hidden="true" />
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
