import { useMemo, useState } from 'react';
import { CreditCard, Layers3, Pencil, Plus, Save, Sparkles, Trash2, WalletCards, X } from 'lucide-react';
import { FilterDropdown } from '../components/common/FilterDropdown';

const initialPointPackages = [
  {
    id: 'pt-starter',
    label: 'Starter Points',
    tag: 'Most Popular',
    points: 5000,
    price: 49,
    discountType: 'amount',
    discountValue: 0,
    status: 'active',
  },
  {
    id: 'pt-growth',
    label: 'Growth Points',
    tag: 'Best Value',
    points: 15000,
    price: 129,
    discountType: 'percentage',
    discountValue: 8,
    status: 'active',
  },
  {
    id: 'pt-scale',
    label: 'Scale Points',
    tag: 'Most Popular',
    points: 40000,
    price: 299,
    discountType: 'percentage',
    discountValue: 15,
    status: 'inactive',
  },
];

const initialSubscriptionPackages = [
  {
    id: 'sub-core',
    name: 'Core Vault',
    amount: 199,
    timePeriod: 'Monthly',
    storageLimit: 500,
    points: 10000,
    status: 'Active',
    description: 'Core file storage and admin oversight for growing teams.',
  },
  {
    id: 'sub-business',
    name: 'Business Vault',
    amount: 4490,
    timePeriod: 'Yearly',
    storageLimit: 2500,
    points: 60000,
    status: 'Active',
    description: 'Multi-team subscription for business-grade storage operations.',
  },
];

const blankPointForm = {
  id: '',
  label: '',
  tag: 'Most Popular',
  points: '10000',
  price: '99',
  discountType: 'amount',
  discountValue: '0',
  status: 'active',
};

const blankSubscriptionForm = {
  id: '',
  name: '',
  amount: '299',
  timePeriod: 'Monthly',
  storageLimit: '1000',
  points: '12000',
  discountType: '',
  discountValue: '',
  status: 'Active',
  description: '',
};

const VALID_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 '&().-]*$/;
const POSITIVE_INTEGER_PATTERN = /^\d+$/;
const POSITIVE_DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

function validateName(value, label) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return `${label} is required.`;
  if (trimmedValue.length < 2 || trimmedValue.length > 80) return `${label} must be between 2 and 80 characters.`;
  if (!VALID_NAME_PATTERN.test(trimmedValue)) return `${label} can only contain letters, numbers, spaces, and common punctuation.`;
  return '';
}

function validatePositiveInteger(value, label, required = true) {
  if (String(value).trim() === '') return required ? `${label} is required.` : '';
  if (!POSITIVE_INTEGER_PATTERN.test(String(value)) || Number(value) <= 0) return `${label} must be a whole number greater than 0.`;
  return '';
}

function validatePrice(value, label) {
  if (String(value).trim() === '') return `${label} is required.`;
  if (!POSITIVE_DECIMAL_PATTERN.test(String(value)) || Number(value) <= 0) return `${label} must be greater than 0 with up to 2 decimal places.`;
  return '';
}

function validateDiscount(form) {
  const hasType = Boolean(form.discountType);
  const hasValue = String(form.discountValue).trim() !== '';
  const errors = {};

  if (hasType !== hasValue) {
    if (!hasType) errors.discountType = 'Discount type is required when a discount value is provided.';
    if (!hasValue) errors.discountValue = 'Discount value is required when a discount type is selected.';
  } else if (hasValue && (!POSITIVE_DECIMAL_PATTERN.test(String(form.discountValue)) || Number(form.discountValue) < 0)) {
    errors.discountValue = 'Discount value must be 0 or greater with up to 2 decimal places.';
  } else if (hasValue && form.discountType === 'percentage' && Number(form.discountValue) > 100) {
    errors.discountValue = 'Percentage discount cannot exceed 100.';
  }

  return errors;
}

function validatePointPackage(form) {
  return {
    label: validateName(form.label, 'Label'),
    points: validatePositiveInteger(form.points, 'Points'),
    price: validatePrice(form.price, 'Price'),
    status: form.status ? '' : 'Status is required.',
    ...validateDiscount(form),
  };
}

function validateStoragePackage(form) {
  return {
    name: validateName(form.name, 'Name'),
    storageLimit: validatePositiveInteger(form.storageLimit, 'Storage'),
    amount: validatePrice(form.amount, 'Price'),
    timePeriod: form.timePeriod ? '' : 'Time period is required.',
    status: form.status ? '' : 'Status is required.',
    points: validatePositiveInteger(form.points, 'Points', false),
    ...validateDiscount(form),
  };
}

function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <article className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-panel shadow-emerald-950/5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={18} />
      </span>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </article>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-emerald-700'
      }`}
    >
      {children}
    </button>
  );
}

function PackageCard({
  title,
  meta,
  status,
  description,
  metrics,
  onEdit,
  onDelete,
  isEditing = false,
  onSave,
  onCancel,
  children,
}) {
  const isActive = status === 'active' || status === 'Active';

  return (
    <article className={`rounded-3xl border border-slate-200 bg-white shadow-panel ${isEditing ? 'p-5' : 'p-4'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${isEditing ? 'gap-4' : 'gap-3'}`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {!isEditing ? <p className="mt-0.5 text-sm font-medium text-emerald-700">{meta}</p> : null}
          {!isEditing && description ? <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-500">{description}</p> : null}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onSave}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                <Save size={14} />
                Save
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
      {isEditing ? (
        <div className="mt-5">{children}</div>
      ) : (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
              <p className="mt-1.5 text-base font-semibold text-slate-800">{metric.value}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[10px] font-medium leading-4 text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

function inputClassName() {
  return 'mt-2 h-9 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100';
}

function ThemedDropdown({ value, onChange, options, placeholder }) {
  return (
    <div className="mt-2 [&_.filter-dropdown-trigger]:rounded-2xl [&_.filter-dropdown-trigger]:px-4 [&_.filter-dropdown-trigger]:text-sm [&_.filter-dropdown-trigger]:font-medium [&_.filter-dropdown-trigger]:shadow-none">
      <FilterDropdown
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        searchable={false}
        showPlaceholderOption={false}
        tone="vault"
      />
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Package Builder</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function PlansPage() {
  const [activeTab, setActiveTab] = useState('points');
  const [pointPackages, setPointPackages] = useState(initialPointPackages);
  const [subscriptionPackages, setSubscriptionPackages] = useState(initialSubscriptionPackages);
  const [pointForm, setPointForm] = useState(blankPointForm);
  const [subscriptionForm, setSubscriptionForm] = useState(blankSubscriptionForm);
  const [isPointBuilderOpen, setIsPointBuilderOpen] = useState(false);
  const [isSubscriptionBuilderOpen, setIsSubscriptionBuilderOpen] = useState(false);
  const [editingPointId, setEditingPointId] = useState(null);
  const [editingPointForm, setEditingPointForm] = useState(blankPointForm);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState(null);
  const [editingSubscriptionForm, setEditingSubscriptionForm] = useState(blankSubscriptionForm);
  const [pointErrors, setPointErrors] = useState({});
  const [subscriptionErrors, setSubscriptionErrors] = useState({});
  const [editingPointErrors, setEditingPointErrors] = useState({});
  const [editingSubscriptionErrors, setEditingSubscriptionErrors] = useState({});

  const totalPointRevenue = useMemo(
    () => pointPackages.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [pointPackages],
  );
  const totalSubscriptionRevenue = useMemo(
    () => subscriptionPackages.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [subscriptionPackages],
  );

  const handlePointChange = (key, value) => {
    setPointForm((prev) => ({ ...prev, [key]: value }));
    setPointErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubscriptionChange = (key, value) => {
    setSubscriptionForm((prev) => ({ ...prev, [key]: value }));
    setSubscriptionErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const savePointPackage = () => {
    const errors = validatePointPackage(pointForm);
    setPointErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      id: pointForm.id || `pt-${pointForm.label.trim().toLowerCase().replace(/\s+/g, '-')}`,
      label: pointForm.label.trim() || 'Untitled Package',
      tag: pointForm.tag,
      points: Number(pointForm.points || 0),
      price: Number(pointForm.price || 0),
      discountType: pointForm.discountType,
      discountValue: Number(pointForm.discountValue || 0),
      status: pointForm.status,
    };

    setPointPackages((prev) => {
      const exists = prev.some((item) => item.id === payload.id);
      return exists ? prev.map((item) => (item.id === payload.id ? payload : item)) : [payload, ...prev];
    });
    setPointForm(blankPointForm);
    setIsPointBuilderOpen(false);
  };

  const saveSubscriptionPackage = () => {
    const errors = validateStoragePackage(subscriptionForm);
    setSubscriptionErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      id: subscriptionForm.id || `sub-${subscriptionForm.name.trim().toLowerCase().replace(/\s+/g, '-')}`,
      name: subscriptionForm.name.trim() || 'Untitled Storage Package',
      amount: Number(subscriptionForm.amount || 0),
      timePeriod: subscriptionForm.timePeriod,
      storageLimit: Number(subscriptionForm.storageLimit || 0),
      points: Number(subscriptionForm.points || 0),
      discountType: subscriptionForm.discountType || null,
      discountValue: subscriptionForm.discountValue === '' ? null : Number(subscriptionForm.discountValue),
      status: subscriptionForm.status,
      description: subscriptionForm.description.trim() || 'No description added yet.',
    };

    setSubscriptionPackages((prev) => {
      const exists = prev.some((item) => item.id === payload.id);
      return exists ? prev.map((item) => (item.id === payload.id ? payload : item)) : [payload, ...prev];
    });
    setSubscriptionForm(blankSubscriptionForm);
    setIsSubscriptionBuilderOpen(false);
  };

  const editPointPackage = (item) => {
    setEditingPointErrors({});
    setEditingPointId(item.id);
    setEditingPointForm({
      id: item.id,
      label: item.label,
      tag: item.tag ?? 'Most Popular',
      points: String(item.points),
      price: String(item.price),
      discountType: item.discountType ?? '',
      discountValue: item.discountValue == null ? '' : String(item.discountValue),
      status: item.status,
    });
  };

  const editSubscriptionPackage = (item) => {
    setEditingSubscriptionErrors({});
    setEditingSubscriptionId(item.id);
    setEditingSubscriptionForm({
      id: item.id,
      name: item.name,
      amount: String(item.amount),
      timePeriod: item.timePeriod,
      storageLimit: String(item.storageLimit),
      points: String(item.points),
      discountType: item.discountType ?? '',
      discountValue: item.discountValue == null ? '' : String(item.discountValue),
      status: item.status,
      description: item.description,
    });
  };

  const updateEditingPointForm = (key, value) => {
    setEditingPointForm((prev) => ({ ...prev, [key]: value }));
    setEditingPointErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const updateEditingSubscriptionForm = (key, value) => {
    setEditingSubscriptionForm((prev) => ({ ...prev, [key]: value }));
    setEditingSubscriptionErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const saveInlinePointPackage = () => {
    const errors = validatePointPackage(editingPointForm);
    setEditingPointErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      id: editingPointId,
      label: editingPointForm.label.trim() || 'Untitled Package',
      tag: editingPointForm.tag,
      points: Number(editingPointForm.points || 0),
      price: Number(editingPointForm.price || 0),
      discountType: editingPointForm.discountType,
      discountValue: Number(editingPointForm.discountValue || 0),
      status: editingPointForm.status,
    };

    setPointPackages((prev) => prev.map((item) => (item.id === editingPointId ? payload : item)));
    setEditingPointId(null);
    setEditingPointForm(blankPointForm);
  };

  const saveInlineSubscriptionPackage = () => {
    const errors = validateStoragePackage(editingSubscriptionForm);
    setEditingSubscriptionErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      id: editingSubscriptionId,
      name: editingSubscriptionForm.name.trim() || 'Untitled Storage Package',
      amount: Number(editingSubscriptionForm.amount || 0),
      timePeriod: editingSubscriptionForm.timePeriod,
      storageLimit: Number(editingSubscriptionForm.storageLimit || 0),
      points: Number(editingSubscriptionForm.points || 0),
      discountType: editingSubscriptionForm.discountType || null,
      discountValue: editingSubscriptionForm.discountValue === '' ? null : Number(editingSubscriptionForm.discountValue),
      status: editingSubscriptionForm.status,
      description: editingSubscriptionForm.description.trim() || 'No description added yet.',
    };

    setSubscriptionPackages((prev) => prev.map((item) => (item.id === editingSubscriptionId ? payload : item)));
    setEditingSubscriptionId(null);
    setEditingSubscriptionForm(blankSubscriptionForm);
  };

  const pointFormMode = 'Create Point Package';
  const subscriptionFormMode = 'Create Storage Package';
  const pointDiscountTypeOptions = [
    { value: 'amount', label: 'Amount' },
    { value: 'percentage', label: 'Percentage' },
  ];
  const pointStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
  const subscriptionStatusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  const subscriptionTimePeriodOptions = [
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Yearly', label: 'Yearly' },
  ];

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_right,rgba(20,184,166,0.18),transparent_28%),linear-gradient(135deg,#ecfdf5_0%,#f8fafc_52%,#effff8_100%)] p-3.5 shadow-panel sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <Sparkles size={12} />
              Vault Monetization
            </span>
            <h1 className="mt-2 text-[1.7rem] font-semibold tracking-tight text-slate-900 sm:text-[1.8rem]">Plans</h1>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Configure point packages and storage packages for Vault.
            </p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:min-w-[300px]">
            <StatCard icon={WalletCards} label="Point packages" value={String(pointPackages.length)} tone="bg-emerald-100 text-emerald-700" />
            <StatCard icon={CreditCard} label="Storage packages" value={String(subscriptionPackages.length)} tone="bg-teal-100 text-teal-700" />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <TabButton active={activeTab === 'points'} onClick={() => setActiveTab('points')}>Point Packages</TabButton>
        <TabButton active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>Storage Packages</TabButton>
      </div>

      {activeTab === 'points' ? (
        <>
          <section className="space-y-5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setPointForm(blankPointForm);
                  setPointErrors({});
                  setIsPointBuilderOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus size={16} />
                Create Package
              </button>
            </div>
            <div className="space-y-4">
              {pointPackages.map((item) => (
                <PackageCard
                  key={item.id}
                  title={item.label}
                  meta={`$${item.price.toLocaleString('en-US')} · ${item.points.toLocaleString('en-US')} points`}
                  status={item.status}
                  description=""
                  isEditing={editingPointId === item.id}
                  onEdit={() => editPointPackage(item)}
                  onSave={saveInlinePointPackage}
                  onCancel={() => {
                    setEditingPointId(null);
                    setEditingPointForm(blankPointForm);
                    setEditingPointErrors({});
                  }}
                  onDelete={() => setPointPackages((prev) => prev.filter((pkg) => pkg.id !== item.id))}
                  metrics={[]}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Label" error={editingPointErrors.label}>
                      <input value={editingPointForm.label} onChange={(event) => updateEditingPointForm('label', event.target.value)} className={inputClassName()} />
                    </Field>
                    <Field label="Points" error={editingPointErrors.points}>
                      <input inputMode="numeric" value={editingPointForm.points} onChange={(event) => updateEditingPointForm('points', event.target.value)} className={inputClassName()} />
                    </Field>
                    <Field label="Price (USD)" error={editingPointErrors.price}>
                      <input inputMode="decimal" value={editingPointForm.price} onChange={(event) => updateEditingPointForm('price', event.target.value)} className={inputClassName()} />
                    </Field>
                    <Field label="Status">
                      <ThemedDropdown
                        value={editingPointForm.status}
                        onChange={(value) => updateEditingPointForm('status', value ?? 'active')}
                        options={pointStatusOptions}
                        placeholder="Select status"
                      />
                    </Field>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <Field label="Discount type" error={editingPointErrors.discountType}>
                      <ThemedDropdown
                        value={editingPointForm.discountType}
                        onChange={(value) => updateEditingPointForm('discountType', value ?? 'amount')}
                        options={pointDiscountTypeOptions}
                        placeholder="Select discount type"
                      />
                    </Field>
                    <Field label="Discount value" error={editingPointErrors.discountValue}>
                      <input inputMode="decimal" value={editingPointForm.discountValue} onChange={(event) => updateEditingPointForm('discountValue', event.target.value)} className={inputClassName()} />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Tag">
                      <input
                        value={editingPointForm.tag}
                        onChange={(event) => updateEditingPointForm('tag', event.target.value)}
                        className={inputClassName()}
                        placeholder="Most Popular / Best Value"
                        maxLength={25}
                      />
                    </Field>
                  </div>
                </PackageCard>
              ))}
            </div>
          </section>
          {isPointBuilderOpen ? (
            <Modal
              title={pointFormMode}
              subtitle=""
              onClose={() => setIsPointBuilderOpen(false)}
            >
              <div className="space-y-4">
                <Field label="Label" error={pointErrors.label}>
                  <input value={pointForm.label} onChange={(event) => handlePointChange('label', event.target.value)} className={inputClassName()} placeholder="Label" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Points included" error={pointErrors.points}>
                    <input inputMode="numeric" value={pointForm.points} onChange={(event) => handlePointChange('points', event.target.value)} className={inputClassName()} />
                  </Field>
                  <Field label="Price (USD)" error={pointErrors.price}>
                    <input inputMode="decimal" value={pointForm.price} onChange={(event) => handlePointChange('price', event.target.value)} className={inputClassName()} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Discount type" error={pointErrors.discountType}>
                    <ThemedDropdown
                      value={pointForm.discountType}
                      onChange={(value) => handlePointChange('discountType', value ?? 'amount')}
                      options={pointDiscountTypeOptions}
                      placeholder="Select discount type"
                    />
                  </Field>
                  <Field label="Discount value" error={pointErrors.discountValue}>
                    <input inputMode="decimal" value={pointForm.discountValue} onChange={(event) => handlePointChange('discountValue', event.target.value)} className={inputClassName()} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tag">
                    <input
                      value={pointForm.tag}
                      onChange={(event) => handlePointChange('tag', event.target.value)}
                      className={inputClassName()}
                      placeholder="Most Popular / Best Value"
                      maxLength={25}
                    />
                  </Field>
                  <Field label="Status">
                    <ThemedDropdown
                      value={pointForm.status}
                      onChange={(value) => handlePointChange('status', value ?? 'active')}
                      options={pointStatusOptions}
                      placeholder="Select status"
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={savePointPackage} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <Save size={15} />
                  Create
                </button>
                <button type="button" onClick={() => { setPointForm(blankPointForm); setPointErrors({}); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
                  Reset
                </button>
              </div>
            </Modal>
          ) : null}
        </>
      ) : (
        <>
          <section className="space-y-5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setSubscriptionForm(blankSubscriptionForm);
                  setSubscriptionErrors({});
                  setIsSubscriptionBuilderOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus size={16} />
                Create Package
              </button>
            </div>
            <div className="space-y-4">
              {subscriptionPackages.map((item) => (
                <PackageCard
                  key={item.id}
                  title={item.name}
                  meta={`$${item.amount.toLocaleString('en-US')} · ${item.timePeriod} · ${item.storageLimit.toLocaleString('en-US')} GB · ${item.points.toLocaleString('en-US')} points`}
                  status={item.status}
                  description={item.description}
                  isEditing={editingSubscriptionId === item.id}
                  onEdit={() => editSubscriptionPackage(item)}
                  onSave={saveInlineSubscriptionPackage}
                  onCancel={() => {
                    setEditingSubscriptionId(null);
                    setEditingSubscriptionForm(blankSubscriptionForm);
                    setEditingSubscriptionErrors({});
                  }}
                  onDelete={() => setSubscriptionPackages((prev) => prev.filter((pkg) => pkg.id !== item.id))}
                  metrics={[]}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Storage package name" error={editingSubscriptionErrors.name}>
                      <input value={editingSubscriptionForm.name} onChange={(event) => updateEditingSubscriptionForm('name', event.target.value)} className={inputClassName()} />
                    </Field>
                    <Field label="Status">
                      <ThemedDropdown
                        value={editingSubscriptionForm.status}
                        onChange={(value) => updateEditingSubscriptionForm('status', value ?? 'Active')}
                        options={subscriptionStatusOptions}
                        placeholder="Select status"
                      />
                    </Field>
                    <Field label="Storage (GB)" error={editingSubscriptionErrors.storageLimit}>
                      <input inputMode="numeric" value={editingSubscriptionForm.storageLimit} onChange={(event) => updateEditingSubscriptionForm('storageLimit', event.target.value)} className={inputClassName()} />
                    </Field>
                    <Field label="Price (USD)" error={editingSubscriptionErrors.amount}>
                      <input inputMode="decimal" value={editingSubscriptionForm.amount} onChange={(event) => updateEditingSubscriptionForm('amount', event.target.value)} className={inputClassName()} />
                    </Field>
                    <Field label="Time Period">
                      <ThemedDropdown
                        value={editingSubscriptionForm.timePeriod}
                        onChange={(value) => updateEditingSubscriptionForm('timePeriod', value ?? 'Monthly')}
                        options={subscriptionTimePeriodOptions}
                        placeholder="Select time period"
                      />
                    </Field>
                    <Field label="Points" error={editingSubscriptionErrors.points}>
                      <input inputMode="numeric" value={editingSubscriptionForm.points} onChange={(event) => updateEditingSubscriptionForm('points', event.target.value)} className={inputClassName()} />
                    </Field>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <Field label="Discount type" error={editingSubscriptionErrors.discountType}>
                      <ThemedDropdown value={editingSubscriptionForm.discountType} onChange={(value) => updateEditingSubscriptionForm('discountType', value ?? '')} options={pointDiscountTypeOptions} placeholder="Select discount type" />
                    </Field>
                    <Field label="Discount value" error={editingSubscriptionErrors.discountValue}>
                      <input inputMode="decimal" value={editingSubscriptionForm.discountValue} onChange={(event) => updateEditingSubscriptionForm('discountValue', event.target.value)} className={inputClassName()} />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Description">
                      <textarea value={editingSubscriptionForm.description} onChange={(event) => updateEditingSubscriptionForm('description', event.target.value)} className={`${inputClassName()} min-h-28 resize-none`} />
                    </Field>
                  </div>
                </PackageCard>
              ))}
            </div>
          </section>
          {isSubscriptionBuilderOpen ? (
            <Modal
              title={subscriptionFormMode}
              subtitle=""
              onClose={() => setIsSubscriptionBuilderOpen(false)}
            >
              <div className="space-y-4">
                <Field label="Storage package name" error={subscriptionErrors.name}>
                  <input value={subscriptionForm.name} onChange={(event) => handleSubscriptionChange('name', event.target.value)} className={inputClassName()} placeholder="Storage package name" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Storage (GB)" error={subscriptionErrors.storageLimit}>
                    <input inputMode="numeric" value={subscriptionForm.storageLimit} onChange={(event) => handleSubscriptionChange('storageLimit', event.target.value)} className={inputClassName()} />
                  </Field>
                  <Field label="Price (USD)" error={subscriptionErrors.amount}>
                    <input inputMode="decimal" value={subscriptionForm.amount} onChange={(event) => handleSubscriptionChange('amount', event.target.value)} className={inputClassName()} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Time Period">
                    <ThemedDropdown
                      value={subscriptionForm.timePeriod}
                      onChange={(value) => handleSubscriptionChange('timePeriod', value ?? 'Monthly')}
                      options={subscriptionTimePeriodOptions}
                      placeholder="Select time period"
                    />
                  </Field>
                  <Field label="Status">
                    <ThemedDropdown
                      value={subscriptionForm.status}
                      onChange={(value) => handleSubscriptionChange('status', value ?? 'Active')}
                      options={subscriptionStatusOptions}
                      placeholder="Select status"
                    />
                  </Field>
                  <Field label="Points" error={subscriptionErrors.points}>
                    <input inputMode="numeric" value={subscriptionForm.points} onChange={(event) => handleSubscriptionChange('points', event.target.value)} className={inputClassName()} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Discount type" error={subscriptionErrors.discountType}>
                    <ThemedDropdown value={subscriptionForm.discountType} onChange={(value) => handleSubscriptionChange('discountType', value ?? '')} options={pointDiscountTypeOptions} placeholder="Select discount type" />
                  </Field>
                  <Field label="Discount value" error={subscriptionErrors.discountValue}>
                    <input inputMode="decimal" value={subscriptionForm.discountValue} onChange={(event) => handleSubscriptionChange('discountValue', event.target.value)} className={inputClassName()} />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea value={subscriptionForm.description} onChange={(event) => handleSubscriptionChange('description', event.target.value)} className={`${inputClassName()} min-h-28 resize-none`} placeholder="Add description..." />
                </Field>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={saveSubscriptionPackage} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <Save size={15} />
                  Create
                </button>
                <button type="button" onClick={() => { setSubscriptionForm(blankSubscriptionForm); setSubscriptionErrors({}); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
                  Reset
                </button>
              </div>
            </Modal>
          ) : null}
        </>
      )}
    </section>
  );
}
