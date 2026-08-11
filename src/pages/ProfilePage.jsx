import { useEffect, useState } from 'react';
import { Check, Mail, Phone, Save, Shield } from 'lucide-react';
import { useAuth } from '../app/AuthContext';

function getDisplayValue(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.name ?? value?.label ?? value?.title ?? fallback;
}

export function ProfilePage() {
  const { adminProduct, profile, updateProfile } = useAuth();
  const [draft, setDraft] = useState(profile ?? {});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(profile ?? {});
  }, [profile]);

  const updateField = (key, value) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateProfile(draft);
    setSaved(true);
  };

  const initials = draft?.name
    ? draft.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';
  const roleLabel = getDisplayValue(draft?.role, adminProduct === 'vault' ? 'Vault SuperAdmin' : 'Twin SuperAdmin');
  const companyLabel = getDisplayValue(draft?.company, adminProduct === 'vault' ? 'Vault' : 'Twin Protocol');

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{adminProduct === 'vault' ? 'Vault Admin Profile' : 'Twin Admin Profile'}</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your {adminProduct === 'vault' ? 'Vault' : 'Twin Protocol'} administrator identity and contact details.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel lg:col-span-1">
          <div className={`h-28 bg-gradient-to-r ${adminProduct === 'vault' ? 'from-emerald-600 via-teal-600 to-cyan-600' : 'from-indigo-600 via-indigo-700 to-blue-600'}`} />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex justify-start">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-xl font-bold text-white shadow-md ${adminProduct === 'vault' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                {initials}
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-xl font-bold text-slate-900">{draft.name}</h2>
              <span className={`mt-1 inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${adminProduct === 'vault' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                {roleLabel}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs font-medium text-slate-700">
                <Mail size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{draft.email}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs font-medium text-slate-700">
                <Phone size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{draft.phone || 'Add a contact number'}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs font-medium text-slate-700">
                <Shield size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{companyLabel}</span>
              </div>
            </div>
          </div>
        </aside>

        <form className="rounded-2xl border border-slate-200 bg-white shadow-panel lg:col-span-2" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Edit Details</h2>
              <p className="text-xs text-slate-500">Update your superadmin account information and profile details.</p>
            </div>
            {saved ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Check size={14} />
                Saved
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Full Name</span>
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={draft.name || ''}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Sushant Singh"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Role</span>
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={roleLabel}
                readOnly
                aria-readonly="true"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Email</span>
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={draft.email || ''}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="name@company.com"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Phone</span>
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={draft.phone || ''}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </label>

            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Company</span>
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={companyLabel}
                onChange={(event) => updateField('company', event.target.value)}
                placeholder="Company or Organization"
              />
            </label>

            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Bio</span>
              <textarea
                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3.5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={draft.bio || ''}
                onChange={(event) => updateField('bio', event.target.value)}
                rows={4}
                placeholder="Tell us about your admin responsibilities..."
              />
            </label>
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:bg-indigo-800"
            >
              <Save size={15} />
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
