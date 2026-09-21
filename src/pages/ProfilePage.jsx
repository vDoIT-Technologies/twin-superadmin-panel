import { useEffect, useState } from 'react';
import { Check, Mail, Phone, Save, Shield } from 'lucide-react';
import { useAuth } from '../app/AuthContext';

function getDisplayValue(value, fallback = '') {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.name ?? value?.label ?? value?.title ?? fallback;
}

const BIO_MAX_LENGTH = 300;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateProfile(values) {
  const errors = {};
  const name = String(values?.name || '').trim();
  const email = String(values?.email || '').trim();
  const phone = String(values?.phone || '');
  const company = getDisplayValue(values?.company).trim();
  const bio = String(values?.bio || '');

  if (!name) errors.name = 'Full name is required.';
  else if (name.length < 2) errors.name = 'Full name must contain at least 2 characters.';
  else if (name.length > 60) errors.name = 'Full name cannot exceed 60 characters.';
  else if (!/^[\p{L}\p{M}.'’ -]+$/u.test(name)) errors.name = 'Full name contains unsupported characters.';

  if (!email) errors.email = 'Email is required.';
  else if (email.length > 254) errors.email = 'Email cannot exceed 254 characters.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';

  if (phone && !/^\d+$/.test(phone)) {
    errors.phone = 'Phone number can contain digits only.';
  } else if (phone && (phone.length < 7 || phone.length > 15)) {
    errors.phone = 'Phone number must contain 7 to 15 digits.';
  }

  if (company && company.length < 2) errors.company = 'Company must contain at least 2 characters.';
  else if (company.length > 100) errors.company = 'Company cannot exceed 100 characters.';

  if (bio.length > BIO_MAX_LENGTH) errors.bio = `Bio cannot exceed ${BIO_MAX_LENGTH} characters.`;

  return errors;
}

function fieldClass(hasError) {
  return `w-full rounded-xl border bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition ${hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
    : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`;
}

export function ProfilePage() {
  const { adminProduct, profile, updateProfile } = useAuth();
  const [draft, setDraft] = useState(profile ?? {});
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDraft(profile ?? {});
    setErrors({});
  }, [profile]);

  const updateField = (key, value) => {
    setSaved(false);
    const next = { ...draft, [key]: value };
    setDraft(next);
    setErrors((current) => ({ ...current, [key]: validateProfile(next)[key] }));
  };

  const validateField = (key) => {
    setErrors((current) => ({ ...current, [key]: validateProfile(draft)[key] }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateProfile({
      ...draft,
      name: String(draft.name || '').trim(),
      email: String(draft.email || '').trim(),
      company: getDisplayValue(draft.company).trim(),
      bio: String(draft.bio || '').trim(),
    });
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

        <form className="rounded-2xl border border-slate-200 bg-white shadow-panel lg:col-span-2" onSubmit={handleSubmit} noValidate>
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
                className={`h-10 ${fieldClass(Boolean(errors.name))}`}
                value={draft.name || ''}
                onChange={(event) => updateField('name', event.target.value)}
                onBlur={() => validateField('name')}
                placeholder="e.g. Sushant Singh"
                maxLength={60}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name ? <span id="name-error" className="text-[11px] font-medium text-rose-600">{errors.name}</span> : null}
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Role</span>
              <input
                className={`h-10 ${fieldClass(false)}`}
                value={roleLabel}
                readOnly
                aria-readonly="true"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Email</span>
              <input
                className={`h-10 ${fieldClass(Boolean(errors.email))}`}
                type="email"
                value={draft.email || ''}
                onChange={(event) => updateField('email', event.target.value)}
                onBlur={() => validateField('email')}
                placeholder="name@company.com"
                maxLength={254}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email ? <span id="email-error" className="text-[11px] font-medium text-rose-600">{errors.email}</span> : null}
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Phone</span>
              <input
                className={`h-10 ${fieldClass(Boolean(errors.phone))}`}
                type="tel"
                inputMode="numeric"
                value={draft.phone || ''}
                onChange={(event) => updateField('phone', event.target.value.replace(/\D/g, '').slice(0, 15))}
                onBlur={() => validateField('phone')}
                placeholder="15550000000"
                maxLength={15}
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
              />
              {errors.phone
                ? <span id="phone-error" className="text-[11px] font-medium text-rose-600">{errors.phone}</span>
                : <span id="phone-hint" className="text-[11px] text-slate-400">7–15 digits, including country code.</span>}
            </label>

            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Company</span>
              <input
                className={`h-10 ${fieldClass(Boolean(errors.company))}`}
                value={companyLabel}
                onChange={(event) => updateField('company', event.target.value)}
                onBlur={() => validateField('company')}
                placeholder="Company or Organization"
                maxLength={100}
                autoComplete="organization"
                aria-invalid={Boolean(errors.company)}
                aria-describedby={errors.company ? 'company-error' : undefined}
              />
              {errors.company ? <span id="company-error" className="text-[11px] font-medium text-rose-600">{errors.company}</span> : null}
            </label>

            <label className="grid gap-1.5 sm:col-span-2">
              <span className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
                <span>Bio</span>
                <span className={draft.bio?.length >= BIO_MAX_LENGTH ? 'text-rose-600' : 'font-normal text-slate-400'}>{draft.bio?.length || 0}/{BIO_MAX_LENGTH}</span>
              </span>
              <textarea
                className={`resize-y py-3.5 ${fieldClass(Boolean(errors.bio))}`}
                value={draft.bio || ''}
                onChange={(event) => updateField('bio', event.target.value)}
                onBlur={() => validateField('bio')}
                rows={4}
                placeholder="Tell us about your admin responsibilities..."
                maxLength={BIO_MAX_LENGTH}
                aria-invalid={Boolean(errors.bio)}
                aria-describedby={errors.bio ? 'bio-error' : undefined}
              />
              {errors.bio ? <span id="bio-error" className="text-[11px] font-medium text-rose-600">{errors.bio}</span> : null}
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
