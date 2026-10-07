import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Package as PackageIcon, Sparkles, X } from 'lucide-react';
import { packageService } from '../../services';
import { formatNumber } from '../../utils/dashboardUtils';
import api from '../../services/httpClient';

function PackageTypeTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${active
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-emerald-700'
        }`}
    >
      {children}
    </button>
  );
}

function unwrapList(response) {
  const payload = response?.data ?? response?.result ?? response;
  if (Array.isArray(payload)) return payload;
  return payload?.packages ?? payload?.items ?? payload?.rows ?? [];
}

function normalizePoint(item) {
  return {
    id: String(item?._id ?? item?.id ?? ''),
    type: 'points',
    title: item?.label ?? '',
    tag: item?.tag ?? '',
    points: Number(item?.points ?? 0),
    price: Number(item?.priceUSD ?? item?.price ?? 0),
    description: item?.description ?? '',
    isActive: item?.isActive !== false,
  };
}

function normalizeStorage(item) {
  const interval = String(item?.interval ?? 'month').toLowerCase();
  return {
    id: String(item?._id ?? item?.id ?? ''),
    type: 'storage',
    title: item?.name ?? '',
    tag: item?.tag ?? '',
    amount: Number(item?.amount ?? 0) / 100,
    interval: interval === 'yearly' ? 'year' : interval === 'monthly' ? 'month' : interval,
    storageGB: Number(item?.storageGB ?? 0),
    description: item?.description ?? '',
    isActive: item?.isActive !== false,
  };
}

function packageMetaLine(pkg) {
  if (pkg.type === 'points') {
    return `$${pkg.price.toLocaleString('en-US')} · ${formatNumber(pkg.points)} points`;
  }
  const period = pkg.interval === 'year' ? 'Yearly' : 'Monthly';
  return `$${pkg.amount.toLocaleString('en-US')} · ${period} · ${formatNumber(pkg.storageGB)} GB`;
}

function PackageCard({ pkg, selected, onSelect }) {
  const disabled = !pkg.isActive;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onSelect(pkg)}
      className={`w-full rounded-2xl border p-4 text-left transition ${disabled
        ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
        : selected
          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
          : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm font-semibold text-slate-800">
              {pkg.title || 'Untitled package'}
            </strong>
            {pkg.tag ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                {pkg.tag}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pkg.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
            >
              {pkg.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-700">{packageMetaLine(pkg)}</p>
          {pkg.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{pkg.description}</p>
          ) : null}
        </div>
        <span
          className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 text-transparent'
            }`}
        >
          <CheckCircle2 size={12} />
        </span>
      </div>
    </button>
  );
}

export function GrantPackageModal({ open, onClose, user, onGranted }) {
  const [activeType, setActiveType] = useState('points');
  const [pointsPackages, setPointsPackages] = useState([]);
  const [storagePackages, setStoragePackages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let active = true;

    setIsLoading(true);
    setLoadError('');
    setSelected(null);
    setGrantError('');

    Promise.all([
      packageService.getPackages('points'),
      packageService.getPackages('storage'),
    ])
      .then(([pointsRes, storageRes]) => {
        if (!active) return;
        setPointsPackages(unwrapList(pointsRes).map(normalizePoint).filter((p) => p.id));
        setStoragePackages(unwrapList(storageRes).map(normalizeStorage).filter((p) => p.id));
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err?.response?.data?.message || err?.message || 'Packages could not be loaded.',
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const visiblePackages = useMemo(
    () => (activeType === 'points' ? pointsPackages : storagePackages),
    [activeType, pointsPackages, storagePackages],
  );

  if (!open) return null;

  const handleSelect = (pkg) => {
    setSelected(pkg);
    setGrantError('');
  };

  const handleGrant = async () => {
    if (!selected || !user) return;
    setIsGranting(true);
    setGrantError('');

    try {
      const response = await api.post(
        `/api/v1/vault/users/${encodeURIComponent(user._id)}/grant`,
        { planId: selected.id },
      );
      const message =
        response?.data?.message ||
        `"${selected.title}" granted to ${user.name || 'this user'}.`;
      onGranted?.({ package: selected, message });
    } catch (err) {
      setGrantError(
        err?.response?.data?.message || err?.message || 'Grant failed. Please try again.',
      );
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="grant-package-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Grant Package
            </p>
            <h2 id="grant-package-title" className="mt-1 text-xl font-semibold text-slate-900">
              Grant a package
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              To <strong className="font-semibold text-slate-700">{user?.name || 'this user'}</strong>
              {user?.email ? <> · {user.email}</> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            aria-label="Close grant dialog"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex gap-2 px-6 pt-4">
            <PackageTypeTab
              active={activeType === 'points'}
              onClick={() => {
                setActiveType('points');
                setSelected(null);
              }}
            >
              Points Package
            </PackageTypeTab>
            <PackageTypeTab
              active={activeType === 'storage'}
              onClick={() => {
                setActiveType('storage');
                setSelected(null);
              }}
            >
              Storage Package
            </PackageTypeTab>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                Loading packages...
              </div>
            ) : loadError ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertCircle size={20} />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Packages could not be loaded
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-500">{loadError}</p>
              </div>
            ) : visiblePackages.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center text-sm text-slate-500">
                <PackageIcon size={20} className="text-slate-300" />
                <p className="mt-3">No {activeType} packages found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visiblePackages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={selected?.id === pkg.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {selected ? (
          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 text-xs text-slate-600">
            <Sparkles size={13} className="mr-1.5 inline-block text-emerald-600" />
            Grant <strong className="font-semibold text-slate-800">{selected.title}</strong> to{' '}
            <strong className="font-semibold text-slate-800">{user?.name || 'this user'}</strong>?
            This will be recorded as an admin grant with no payment.
          </div>
        ) : null}

        {grantError ? (
          <div className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-xs text-rose-700">
            {grantError}
          </div>
        ) : null}

        <footer className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isGranting}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGrant}
            disabled={!selected || isGranting}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGranting ? 'Granting...' : 'Grant Package'}
          </button>
        </footer>
      </section>
    </div>
  );
}