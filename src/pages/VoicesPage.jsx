import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  History, RefreshCw, Search, ShieldAlert, Trash2, Users, X, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { voiceService } from '../services/voiceService';
import { TruncatedText } from '../components/common/TruncatedText';
import { envBadge } from '../utils/dashboardUtils';
import { useAuth } from '../app/AuthContext';
import { DeletionHistoryPage } from './DeletionHistoryPage';

const PAGE_SIZE = 10;

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'prod', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'dev', label: 'Dev' },
  { value: 'unused', label: 'Unused' },
];

const formatUnix = (unix) =>
  unix ? new Date(unix * 1000).toLocaleDateString() : '—';

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function VoicesPage() {
  const { adminProduct, appEnvironment } = useAuth();
  const isVault = adminProduct === 'vault';
  const currentEnv = appEnvironment || 'dev';

  const queryClient = useQueryClient();
  const forceRefreshRef = useRef(false);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const debouncedSearch = useDebounce(search.trim(), 300);

  useEffect(() => {
    const deleteToken = sessionStorage.getItem('superadmin_delete_token');
    if (deleteToken) {
      try {
        const base64Url = deleteToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        const { exp } = JSON.parse(jsonPayload);
        if (exp * 1000 < Date.now()) {
          sessionStorage.removeItem('superadmin_delete_token');
        }
      } catch (e) {
        sessionStorage.removeItem('superadmin_delete_token');
      }
    }
  }, [confirmDialog]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [tab, debouncedSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const canDeleteEnv = (voiceEnvs = []) => {
    if (currentEnv === 'prod') return true;
    if (currentEnv === 'staging') return !voiceEnvs.includes('prod');
    if (currentEnv === 'dev') return voiceEnvs.every((e) => e === 'dev');
    return false;
  };

  const {
    data: voiceData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['voices', page, tab, debouncedSearch],
    queryFn: () => {
      const refresh = forceRefreshRef.current;
      forceRefreshRef.current = false;
      return voiceService.list(refresh, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        tab,
      });
    },
    enabled: !isVault,
    retry: false,
    keepPreviousData: true,
    placeholderData: (prev) => prev,
  });

  const voices = voiceData?.voices || [];
  const totalCount = voiceData?.pagination?.total ?? 0;
  const totalPages = voiceData?.pagination?.totalPages ?? 1;

  const syncMutation = useMutation({
    mutationFn: () => voiceService.syncHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
      toast.success('Voice history synced successfully');
    },
    onError: (e) => {
      console.error('Sync failed:', e);
      toast.error(e?.response?.data?.message || 'Failed to sync history');
    },
  });

  const delMutation = useMutation({
    mutationFn: async ({ ids, confirmProd, password }) => {
      if (password) {
        await voiceService.verifyPassword(password);
      }
      if (ids.length === 1) {
        return voiceService.deleteOne(ids[0], confirmProd);
      } else {
        return voiceService.deleteBulk(ids, confirmProd);
      }
    },
    onSuccess: (data, variables) => {
      const isBulk = variables.ids.length > 1;
      const failed = data?.results?.failed?.length || 0;

      if (failed > 0) {
        toast.warning(`Bulk delete done. ${failed} failed.`);
      } else {
        toast.success(isBulk ? 'Bulk delete complete' : 'Voice deleted');
      }

      queryClient.invalidateQueries({ queryKey: ['voices'] });
      setSelectedIds(new Set());
      setConfirmDialog(null);
    },
    onError: (e) => {
      if (e?.response?.status === 401) {
        sessionStorage.removeItem('superadmin_delete_token');
      }
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Delete failed');
    },
  });

  useEffect(() => {
    const next = new Set();
    let changed = false;
    selectedIds.forEach((id) => {
      const v = voices.find((voice) => voice.voice_id === id);
      if (v && canDeleteEnv(v.environments)) {
        next.add(id);
      } else {
        changed = true;
      }
    });
    if (changed) setSelectedIds(next);
  }, [voices, currentEnv]);

  const allPageSelected =
    voices.length > 0 && voices.every((v) => selectedIds.has(v.voice_id) && canDeleteEnv(v.environments));

  const handleRefresh = () => {
    forceRefreshRef.current = true;
    refetch();
  };

  if (isVault) {
    return (
      <section className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          ElevenLabs Manager is only available in the Twin SuperAdmin panel.
        </div>
      </section>
    );
  }

  if (historyOpen) {
    return <DeletionHistoryPage onBack={() => setHistoryOpen(false)} />;
  }

  const initiateDelete = (ids) => {
    const prodCount = voices.filter((v) => ids.includes(v.voice_id) && v.protected).length;
    setConfirmDialog({ ids, prodCount });
  };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center">
          <label className="flex h-10 w-full items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 xl:w-64">
            <Search size={15} />
            <input
              type="text"
              name="voice-manager-filter"
              id="voice-manager-filter"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Search voices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${tab === t.value ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={isFetching || syncMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
              title="Sync Last Used data from ElevenLabs"
            >
              <RefreshCw size={14} className={isFetching || syncMutation.isPending ? 'animate-spin' : ''} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync History'}
            </button>
            
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching || syncMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isFetching || syncMutation.isPending ? 'animate-spin' : ''} />
              Refresh List
            </button>

            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <History size={14} />
              Deletion History
            </button>

            {selectedIds.size > 0 ? (
              <button
                type="button"
                onClick={() => initiateDelete([...selectedIds])}
                className="ml-2 inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700"
              >
                <Trash2 size={14} />
                Delete {selectedIds.size}
              </button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={(e) => {
                      const next = new Set(selectedIds);
                      voices.forEach((v) => {
                        if (!canDeleteEnv(v.environments)) return;
                        e.target.checked ? next.add(v.voice_id) : next.delete(v.voice_id);
                      });
                      setSelectedIds(next);
                    }}
                  />
                </th>
                <th className="w-16 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Voice Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Voice ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Created</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">Last Used</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Environments</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Twins</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Usage</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-400">
                    <RefreshCw className="mx-auto mb-2 animate-spin text-indigo-400" size={20} />
                    Loading voices…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-rose-500">
                    Failed to load voices: {error?.response?.data?.message || error.message}
                  </td>
                </tr>
              ) : voices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-400">No voices found.</td>
                </tr>
              ) : (
                voices.map((v) => {
                  const allowedToDelete = canDeleteEnv(v.environments);
                  return (
                    <tr key={v.voice_id} className="group border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          disabled={!allowedToDelete}
                          checked={selectedIds.has(v.voice_id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(v.voice_id);
                            else next.delete(v.voice_id);
                            setSelectedIds(next);
                          }}
                          className="disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!allowedToDelete ? `Requires higher environment access` : ''}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <div
                            className={`h-2.5 w-2.5 rounded-full shadow-sm transition-all ${v.is_used ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            title={v.is_used ? 'In Use' : 'Unused'}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedVoice(v)}
                            className="text-left text-sm font-semibold text-slate-800 hover:text-indigo-600"
                          >
                            <TruncatedText value={v.name || 'Unnamed'} />
                          </button>
                          {v.protected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              <ShieldAlert size={10} /> PROD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                          {v.voice_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatUnix(v.created_at_unix)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatUnix(v.last_used_unix)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {(v.environments || []).map((env) => (
                            <span key={env}>{envBadge(env)}</span>
                          ))}
                          {(!v.environments || v.environments.length === 0) && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {v.usage_details?.length ? (
                          <button
                            type="button"
                            onClick={() => setSelectedVoice(v)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Users size={12} /> View ({v.usage_details.length})
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-0.5 font-mono text-xs font-bold ${v.usage_count === 0 ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-700'}`}
                        >
                          {v.usage_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => initiateDelete([v.voice_id])}
                          disabled={!allowedToDelete}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title={!allowedToDelete ? 'Requires higher environment access' : (v.protected ? 'Delete production voice (audit-logged)' : 'Delete voice')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          <span>
            Showing {rangeStart}-{rangeEnd} of {totalCount} voices
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {selectedVoice ? (
        <VoiceDetailsModal voice={selectedVoice} onClose={() => setSelectedVoice(null)} />
      ) : null}

      {confirmDialog ? (
        <DeleteConfirmDialog
          prodCount={confirmDialog.prodCount}
          count={confirmDialog.ids.length}
          busy={delMutation.isPending}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={(password, confirmedProd) => {
            delMutation.mutate({
              ids: confirmDialog.ids,
              confirmProd: confirmedProd || confirmDialog.prodCount > 0,
              password: password,
            });
          }}
        />
      ) : null}

    </section>
  );
}

function VoiceDetailsModal({ voice, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="voice-modal-title" className="text-xl font-semibold text-slate-900">
              {voice.name}
            </h2>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">{voice.voice_id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            aria-label="Close details dialog"
          >
            <X size={18} />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${voice.is_used ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}
              >
                {voice.is_used ? 'In Use' : 'Unused'}
              </span>
              {voice.protected ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                  Protected (Prod)
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs font-medium text-slate-400">Created</span>
                <strong className="mt-0.5 block text-slate-700">{formatUnix(voice.created_at_unix)}</strong>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Last used</span>
                <strong className="mt-0.5 block text-slate-700">{formatUnix(voice.last_used_unix)}</strong>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Usage Details ({voice.usage_count})
            </h3>
            {voice.usage_details?.length ? (
              <ul className="mt-3 space-y-2">
                {voice.usage_details.map((d, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-3.5 text-sm shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{d.name}</span>
                      {envBadge(d.env)}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <span>Type: <span className="font-medium text-slate-700">{d.type}</span></span>
                      <span>Usage: <span className="font-medium text-slate-700">{d.usageType}</span></span>
                      {d.clientName ? <span className="col-span-2">Client: <span className="font-medium text-slate-700">{d.clientName}</span></span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                No usage detected for this voice.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function DeleteConfirmDialog({ prodCount, count, busy, onCancel, onConfirm }) {
  const [password, setPassword] = useState('');
  const [typedConfirm, setTypedConfirm] = useState('');

  const hasActiveSession = Boolean(sessionStorage.getItem('superadmin_delete_token'));

  const requiresTyping = prodCount > 0;
  const isProdConfirmed = !requiresTyping || typedConfirm === 'DELETE';

  const isValid = isProdConfirmed && (hasActiveSession || password.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && isValid) onConfirm(password, requiresTyping);
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Confirm deletion</h2>
        <p className="mt-2 text-sm text-slate-500">
          {count === 1
            ? 'Permanently delete this voice from ElevenLabs?'
            : `Permanently delete ${count} voices from ElevenLabs?`}
        </p>

        {requiresTyping ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-semibold text-rose-700">
              ⚠ {prodCount} voice{prodCount === 1 ? '' : 's'} used in PRODUCTION.
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              name="confirm-delete-text"
              autoComplete="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore
              className="mt-2 h-9 w-full rounded-lg border border-rose-200 bg-white px-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="DELETE"
              autoFocus={!hasActiveSession}
            />
          </div>
        ) : null}

        {!hasActiveSession ? (
          <div className="mt-5 space-y-2">
            <label htmlFor="confirm-delete-password" className="text-xs font-semibold text-slate-700">
              Enter your SuperAdmin password to confirm:
            </label>
            <input
              id="confirm-delete-password"
              type="password"
              name="confirm-delete-password"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore
              data-form-type="other"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus={!requiresTyping}
            />
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 border border-emerald-100">
            <CheckCircle2 size={16} className="shrink-0" />
            Identity verified. You can delete without a password for 15 minutes.
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !isValid}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Confirm Delete'}
          </button>
        </div>
      </form>
    </div>
  );
}