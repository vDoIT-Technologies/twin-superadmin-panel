import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Layers3, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2, WalletCards, X } from 'lucide-react';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { packageService } from '../services';

const blankPointForm = {
  id: '',
  label: '',
  tag: '',
  points: '',
  price: '',
  status: 'active',
};

const blankSubscriptionForm = {
  id: '',
  name: '',
  tag: '',
  amount: '',
  timePeriod: 'month',
  storageLimit: '',
  points: '',
  status: 'Active',
  description: '',
};

function unwrapPackageList(response) {
  const payload = response?.data ?? response?.result ?? response;
  if (Array.isArray(payload)) return payload;
  return payload?.packages ?? payload?.items ?? payload?.rows ?? [];
}

function getPackageId(item) {
  return String(item?._id ?? item?.id ?? item?.packageId ?? '');
}

function normalizePointPackage(item) {
  return {
    id: getPackageId(item),
    label: item?.label ?? '',
    tag: item?.tag ?? '',
    points: Number(item?.points ?? 0),
    price: Number(item?.priceUSD ?? item?.price ?? 0),
    status: item?.isActive === false ? 'inactive' : 'active',
  };
}

function normalizeStoragePackage(item) {
  const interval = String(item?.interval ?? item?.timePeriod ?? 'month').toLowerCase();
  return {
    id: getPackageId(item),
    name: item?.name ?? '',
    tag: item?.tag ?? '',
    amount: Number(item?.amount ?? 0) / 100,
    timePeriod: interval === 'yearly' ? 'year' : interval === 'monthly' ? 'month' : interval,
    storageLimit: Number(item?.storageGB ?? item?.storageLimit ?? 0),
    points: Number(item?.bonusPoints ?? item?.points ?? 0),
    status: item?.isActive === false ? 'Inactive' : 'Active',
    description: item?.description ?? '',
  };
}

function getApiErrorMessage(error, fallback) {
  return error?.response?.data?.message ?? error?.response?.data?.error ?? error?.message ?? fallback;
}

const VALID_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 '&().-]*$/;
const POSITIVE_INTEGER_PATTERN = /^\d+$/;
const POSITIVE_DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;
const PRICE_INPUT_PATTERN = /^\d*(\.\d{0,2})?$/;
const PACKAGE_LABEL_MAX_LENGTH = 30;
const PACKAGE_LABEL_PREVIEW_LENGTH = 24;

function validateName(value, label) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return `${label} is required.`;
  const maxLength = label === 'Label' ? PACKAGE_LABEL_MAX_LENGTH : 80;
  if (trimmedValue.length < 2 || trimmedValue.length > maxLength) return `${label} must be between 2 and ${maxLength} characters.`;
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

function validateTag(value) {
  const trimmedValue = value.trim();
  if (trimmedValue.length > 25) return 'Tag must be 25 characters or fewer.';
  return '';
}

function updatePriceIfValid(value, updateForm) {
  if (PRICE_INPUT_PATTERN.test(value)) updateForm(value);
}

function validatePointPackage(form) {
  return {
    label: validateName(form.label, 'Label'),
    points: validatePositiveInteger(form.points, 'Points'),
    price: validatePrice(form.price, 'Price'),
    tag: validateTag(form.tag),
    status: form.status ? '' : 'Status is required.',
  };
}

function validateStoragePackage(form) {
  return {
    name: validateName(form.name, 'Label'),
    storageLimit: validatePositiveInteger(form.storageLimit, 'Storage'),
    amount: validatePrice(form.amount, 'Price'),
    timePeriod: form.timePeriod ? '' : 'Time period is required.',
    status: form.status ? '' : 'Status is required.',
    points: validatePositiveInteger(form.points, 'Points', false),
    tag: validateTag(form.tag),
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

function PackageLabel({ value }) {
  const isTruncated = value.length > PACKAGE_LABEL_PREVIEW_LENGTH;
  const displayedValue = isTruncated
    ? `${value.slice(0, PACKAGE_LABEL_PREVIEW_LENGTH)}…`
    : value;

  return (
    <span
      className="themed-tooltip inline-block max-w-full align-bottom"
      data-tooltip={isTruncated ? value : undefined}
      aria-label={value}
      tabIndex={isTruncated ? 0 : undefined}
    >
      {displayedValue}
    </span>
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
  isBusy = false,
  children,
}) {
  const isActive = status === 'active' || status === 'Active';

  return (
    <article className={`rounded-3xl border border-slate-200 bg-white shadow-panel ${isEditing ? 'p-5' : 'p-4'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${isEditing ? 'gap-4' : 'gap-3'}`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-lg font-semibold text-slate-900"><PackageLabel value={title} /></h3>
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
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
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
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
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

function Field({ label, children, hint, error, required = false }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
        <span>
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </span>
      </span>
      {children}
      {error ? <span className="mt-1 block text-[10px] font-medium leading-4 text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

function inputClassName() {
  return 'mt-2 h-9 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100';
}

function LabelLengthHint({ value }) {
  return (
    <span className="flex items-center justify-between gap-3">
      <span>Use 2–{PACKAGE_LABEL_MAX_LENGTH} characters.</span>
      <span className="tabular-nums">{value.length}/{PACKAGE_LABEL_MAX_LENGTH}</span>
    </span>
  );
}

function ThemedDropdown({ value, onChange, options, placeholder, showPlaceholderOption = false, placement = 'bottom' }) {
  return (
    <div className="mt-2 [&_.filter-dropdown-trigger]:rounded-2xl [&_.filter-dropdown-trigger]:px-4 [&_.filter-dropdown-trigger]:text-sm [&_.filter-dropdown-trigger]:font-medium [&_.filter-dropdown-trigger]:shadow-none">
      <FilterDropdown
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        searchable={false}
        showPlaceholderOption={showPlaceholderOption}
        placement={placement}
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

function DeleteConfirmationModal({ packageName, isDeleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-[2rem] border border-rose-100 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-package-title">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 size={20} /></span>
          <button type="button" onClick={onCancel} disabled={isDeleting} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900 disabled:opacity-50" aria-label="Close confirmation"><X size={17} /></button>
        </div>
        <h2 id="delete-package-title" className="mt-4 text-xl font-semibold text-slate-900">Delete package?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Are you sure you want to delete <strong className="font-semibold text-slate-700">{packageName}</strong>? This package will no longer be available.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={isDeleting} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isDeleting} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">
            <Trash2 size={15} />
            {isDeleting ? 'Deleting...' : 'Delete package'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ type, message, onClose }) {
  const isSuccess = type === 'success';
  return (
    <div className={`fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl ${isSuccess ? 'border-emerald-200' : 'border-rose-200'}`} role={isSuccess ? 'status' : 'alert'}>
      <span className={`mt-0.5 shrink-0 ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isSuccess ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
      </span>
      <p className="flex-1 text-sm font-medium leading-5 text-slate-700">{message}</p>
      <button type="button" onClick={onClose} className="shrink-0 text-slate-400 transition hover:text-slate-700" aria-label="Dismiss notification"><X size={17} /></button>
    </div>
  );
}

export function PlansPage() {
  const [activeTab, setActiveTab] = useState('points');
  const [pointPackages, setPointPackages] = useState([]);
  const [subscriptionPackages, setSubscriptionPackages] = useState([]);
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const loadPackages = useCallback(async ({ showSuccess = false } = {}) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [pointResponse, storageResponse] = await Promise.all([
        packageService.getPackages('points'),
        packageService.getPackages('storage'),
      ]);
      setPointPackages(unwrapPackageList(pointResponse).map(normalizePointPackage));
      setSubscriptionPackages(unwrapPackageList(storageResponse).map(normalizeStoragePackage));
      if (showSuccess) setToast({ type: 'success', message: 'Packages loaded successfully.' });
    } catch (error) {
      console.error('GET /api/v1/packages failed:', error);
      const message = getApiErrorMessage(error, 'Packages could not be loaded.');
      setLoadError(message);
      setToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages({ showSuccess: true });
  }, [loadPackages]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

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

  const savePointPackage = async () => {
    const errors = validatePointPackage(pointForm);
    setPointErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      label: pointForm.label.trim(),
      points: Number(pointForm.points || 0),
      priceUSD: Number(pointForm.price || 0),
      tag: pointForm.tag.trim(),
      isActive: pointForm.status === 'active',
    };
    setPendingAction('create-point');
    setActionError('');
    try {
      const response = await packageService.createPackage(payload);
      await loadPackages();
      setPointForm(blankPointForm);
      setIsPointBuilderOpen(false);
      setToast({ type: 'success', message: response?.message || 'Point package created successfully.' });
    } catch (error) {
      console.error('POST /api/v1/packages failed:', error);
      const message = getApiErrorMessage(error, 'Point package could not be created.');
      setActionError(message);
      setToast({ type: 'error', message });
    } finally {
      setPendingAction('');
    }
  };

  const saveSubscriptionPackage = async () => {
    const errors = validateStoragePackage(subscriptionForm);
    setSubscriptionErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      name: subscriptionForm.name.trim(),
      tag: subscriptionForm.tag.trim(),
      storageGB: Number(subscriptionForm.storageLimit || 0),
      amount: Math.round(Number(subscriptionForm.amount || 0) * 100),
      currency: 'USD',
      interval: subscriptionForm.timePeriod,
      description: subscriptionForm.description.trim() || undefined,
      bonusPoints: subscriptionForm.points === '' ? 0 : Number(subscriptionForm.points),
      isActive: subscriptionForm.status === 'Active',
    };
    setPendingAction('create-storage');
    setActionError('');
    try {
      const response = await packageService.createPackage(payload);
      await loadPackages();
      setSubscriptionForm(blankSubscriptionForm);
      setIsSubscriptionBuilderOpen(false);
      setToast({ type: 'success', message: response?.message || 'Storage package created successfully.' });
    } catch (error) {
      console.error('POST /api/v1/packages failed:', error);
      const message = getApiErrorMessage(error, 'Storage package could not be created.');
      setActionError(message);
      setToast({ type: 'error', message });
    } finally {
      setPendingAction('');
    }
  };

  const editPointPackage = (item) => {
    setEditingPointErrors({});
    setEditingPointId(item.id);
    setEditingPointForm({
      id: item.id,
      label: item.label,
      tag: item.tag ?? '',
      points: String(item.points),
      price: String(item.price),
      status: item.status,
    });
  };

  const editSubscriptionPackage = (item) => {
    setEditingSubscriptionErrors({});
    setEditingSubscriptionId(item.id);
    setEditingSubscriptionForm({
      id: item.id,
      name: item.name,
      tag: item.tag ?? '',
      amount: String(item.amount),
      timePeriod: item.timePeriod,
      storageLimit: String(item.storageLimit),
      points: String(item.points),
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

  const saveInlinePointPackage = async () => {
    const errors = validatePointPackage(editingPointForm);
    setEditingPointErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      label: editingPointForm.label.trim(),
      points: Number(editingPointForm.points || 0),
      priceUSD: Number(editingPointForm.price || 0),
      tag: editingPointForm.tag.trim(),
      isActive: editingPointForm.status === 'active',
    };
    setPendingAction(`update-${editingPointId}`);
    setActionError('');
    try {
      const response = await packageService.updatePackage(editingPointId, payload);
      await loadPackages();
      setEditingPointId(null);
      setEditingPointForm(blankPointForm);
      setToast({ type: 'success', message: response?.message || 'Point package updated successfully.' });
    } catch (error) {
      console.error('PUT /api/v1/packages/:id failed:', error);
      const message = getApiErrorMessage(error, 'Point package could not be updated.');
      setActionError(message);
      setToast({ type: 'error', message });
    } finally {
      setPendingAction('');
    }
  };

  const saveInlineSubscriptionPackage = async () => {
    const errors = validateStoragePackage(editingSubscriptionForm);
    setEditingSubscriptionErrors(errors);
    if (hasErrors(errors)) return;
    const payload = {
      name: editingSubscriptionForm.name.trim(),
      tag: editingSubscriptionForm.tag.trim(),
      storageGB: Number(editingSubscriptionForm.storageLimit || 0),
      amount: Math.round(Number(editingSubscriptionForm.amount || 0) * 100),
      currency: 'USD',
      interval: editingSubscriptionForm.timePeriod,
      description: editingSubscriptionForm.description.trim() || undefined,
      bonusPoints: editingSubscriptionForm.points === '' ? 0 : Number(editingSubscriptionForm.points),
      isActive: editingSubscriptionForm.status === 'Active',
    };
    setPendingAction(`update-${editingSubscriptionId}`);
    setActionError('');
    try {
      const response = await packageService.updatePackage(editingSubscriptionId, payload);
      await loadPackages();
      setEditingSubscriptionId(null);
      setEditingSubscriptionForm(blankSubscriptionForm);
      setToast({ type: 'success', message: response?.message || 'Storage package updated successfully.' });
    } catch (error) {
      console.error('PUT /api/v1/packages/:id failed:', error);
      const message = getApiErrorMessage(error, 'Storage package could not be updated.');
      setActionError(message);
      setToast({ type: 'error', message });
    } finally {
      setPendingAction('');
    }
  };

  const deletePointPackage = async (packageId) => {
    setPendingAction(`delete-${packageId}`);
    setActionError('');
    try {
      const response = await packageService.deletePackage(packageId);
      setPointPackages((prev) => prev.filter((item) => item.id !== packageId));
      setToast({ type: 'success', message: response?.message || 'Point package deleted successfully.' });
      return true;
    } catch (error) {
      console.error('DELETE /api/v1/packages/:id failed:', error);
      const message = getApiErrorMessage(error, 'Point package could not be deleted.');
      setActionError(message);
      setToast({ type: 'error', message });
      return false;
    } finally {
      setPendingAction('');
    }
  };

  const deleteStoragePackage = async (packageId) => {
    setPendingAction(`delete-${packageId}`);
    setActionError('');
    try {
      const response = await packageService.deletePackage(packageId);
      setSubscriptionPackages((prev) => prev.filter((item) => item.id !== packageId));
      setToast({ type: 'success', message: response?.message || 'Storage package deleted successfully.' });
      return true;
    } catch (error) {
      console.error('DELETE /api/v1/packages/:id failed:', error);
      const message = getApiErrorMessage(error, 'Storage package could not be deleted.');
      setActionError(message);
      setToast({ type: 'error', message });
      return false;
    } finally {
      setPendingAction('');
    }
  };

  const confirmDeletePackage = async () => {
    if (!deleteTarget) return;
    const deleted = deleteTarget.type === 'points'
      ? await deletePointPackage(deleteTarget.id)
      : await deleteStoragePackage(deleteTarget.id);
    if (deleted) setDeleteTarget(null);
  };

  const pointFormMode = 'Create Point Package';
  const subscriptionFormMode = 'Create Storage Package';
  const pointStatusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
  const packageTagOptions = [
    { value: 'Most Popular', label: 'Most Popular' },
    { value: 'Best Value', label: 'Best Value' },
  ];
  const subscriptionStatusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  const subscriptionTimePeriodOptions = [
    { value: 'month', label: 'Monthly' },
    { value: 'year', label: 'Yearly' },
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

      {loadError ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="flex items-center gap-2"><AlertCircle size={16} />{loadError}</span>
          <button type="button" onClick={() => loadPackages({ showSuccess: true })} className="inline-flex shrink-0 items-center gap-2 font-semibold"><RefreshCw size={14} />Try again</button>
        </div>
      ) : null}
      {actionError ? (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle size={16} />{actionError}</div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-sm font-medium text-slate-500 shadow-panel">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" aria-hidden="true" />
          Loading packages...
        </div>
      ) : activeTab === 'points' ? (
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
                  isBusy={pendingAction === `update-${item.id}` || pendingAction === `delete-${item.id}`}
                  onCancel={() => {
                    setEditingPointId(null);
                    setEditingPointForm(blankPointForm);
                    setEditingPointErrors({});
                  }}
                  onDelete={() => {
                    setActionError('');
                    setDeleteTarget({ id: item.id, type: 'points', name: item.label });
                  }}
                  metrics={[]}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Label" error={editingPointErrors.label} hint={<LabelLengthHint value={editingPointForm.label} />} required>
                      <input value={editingPointForm.label} onChange={(event) => updateEditingPointForm('label', event.target.value)} className={inputClassName()} placeholder="Enter label" maxLength={PACKAGE_LABEL_MAX_LENGTH} aria-label={`Package label, ${editingPointForm.label.length} of ${PACKAGE_LABEL_MAX_LENGTH} characters used`} />
                    </Field>
                    <Field label="Points" error={editingPointErrors.points} required>
                      <input inputMode="numeric" value={editingPointForm.points} onChange={(event) => updateEditingPointForm('points', event.target.value)} className={inputClassName()} placeholder="Enter points included" />
                    </Field>
                    <Field label="Price (USD)" error={editingPointErrors.price} required>
                      <input inputMode="decimal" value={editingPointForm.price} onChange={(event) => updatePriceIfValid(event.target.value, (value) => updateEditingPointForm('price', value))} className={inputClassName()} placeholder="Enter price" />
                    </Field>
                    <Field label="Status" required>
                      <ThemedDropdown
                        value={editingPointForm.status}
                        onChange={(value) => updateEditingPointForm('status', value ?? 'active')}
                        options={pointStatusOptions}
                        placeholder="Select status"
                      />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Tag" error={editingPointErrors.tag}>
                      <ThemedDropdown
                        value={editingPointForm.tag}
                        onChange={(value) => updateEditingPointForm('tag', value ?? '')}
                        options={packageTagOptions}
                        placeholder="No tag"
                        showPlaceholderOption
                        placement="top"
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
                <Field label="Label" error={pointErrors.label} hint={<LabelLengthHint value={pointForm.label} />} required>
                  <input value={pointForm.label} onChange={(event) => handlePointChange('label', event.target.value)} className={inputClassName()} placeholder="Enter label" maxLength={PACKAGE_LABEL_MAX_LENGTH} aria-label={`Package label, ${pointForm.label.length} of ${PACKAGE_LABEL_MAX_LENGTH} characters used`} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Points included" error={pointErrors.points} required>
                    <input inputMode="numeric" value={pointForm.points} onChange={(event) => handlePointChange('points', event.target.value)} className={inputClassName()} placeholder="Enter points included" />
                  </Field>
                  <Field label="Price (USD)" error={pointErrors.price} required>
                    <input inputMode="decimal" value={pointForm.price} onChange={(event) => updatePriceIfValid(event.target.value, (value) => handlePointChange('price', value))} className={inputClassName()} placeholder="Enter price" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tag" error={pointErrors.tag}>
                    <ThemedDropdown
                      value={pointForm.tag}
                      onChange={(value) => handlePointChange('tag', value ?? '')}
                      options={packageTagOptions}
                      placeholder="No tag"
                      showPlaceholderOption
                      placement="top"
                    />
                  </Field>
                  <Field label="Status" required>
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
                <button type="button" onClick={savePointPackage} disabled={pendingAction === 'create-point'} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
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
                  meta={`$${item.amount.toLocaleString('en-US')} · ${item.timePeriod === 'year' ? 'Yearly' : 'Monthly'} · ${item.storageLimit.toLocaleString('en-US')} GB · ${item.points.toLocaleString('en-US')} points`}
                  status={item.status}
                  description={item.description}
                  isEditing={editingSubscriptionId === item.id}
                  onEdit={() => editSubscriptionPackage(item)}
                  onSave={saveInlineSubscriptionPackage}
                  isBusy={pendingAction === `update-${item.id}` || pendingAction === `delete-${item.id}`}
                  onCancel={() => {
                    setEditingSubscriptionId(null);
                    setEditingSubscriptionForm(blankSubscriptionForm);
                    setEditingSubscriptionErrors({});
                  }}
                  onDelete={() => {
                    setActionError('');
                    setDeleteTarget({ id: item.id, type: 'storage', name: item.name });
                  }}
                  metrics={[]}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Label" error={editingSubscriptionErrors.name} hint={<LabelLengthHint value={editingSubscriptionForm.name} />} required>
                      <input value={editingSubscriptionForm.name} onChange={(event) => updateEditingSubscriptionForm('name', event.target.value)} className={inputClassName()} placeholder="Enter label" maxLength={PACKAGE_LABEL_MAX_LENGTH} />
                    </Field>
                    <Field label="Status" required>
                      <ThemedDropdown
                        value={editingSubscriptionForm.status}
                        onChange={(value) => updateEditingSubscriptionForm('status', value ?? 'Active')}
                        options={subscriptionStatusOptions}
                        placeholder="Select status"
                      />
                    </Field>
                    <Field label="Storage (GB)" error={editingSubscriptionErrors.storageLimit} required>
                      <input inputMode="numeric" value={editingSubscriptionForm.storageLimit} onChange={(event) => updateEditingSubscriptionForm('storageLimit', event.target.value)} className={inputClassName()} placeholder="Enter storage (GB)" />
                    </Field>
                    <Field label="Price (USD)" error={editingSubscriptionErrors.amount} required>
                      <input inputMode="decimal" value={editingSubscriptionForm.amount} onChange={(event) => updatePriceIfValid(event.target.value, (value) => updateEditingSubscriptionForm('amount', value))} className={inputClassName()} placeholder="Enter price (USD)" />
                    </Field>
                    <Field label="Time Period" required>
                      <ThemedDropdown
                        value={editingSubscriptionForm.timePeriod}
                        onChange={(value) => updateEditingSubscriptionForm('timePeriod', value ?? 'month')}
                        options={subscriptionTimePeriodOptions}
                        placeholder="Select time period"
                      />
                    </Field>
                    <Field label="Points" error={editingSubscriptionErrors.points}>
                      <input inputMode="numeric" value={editingSubscriptionForm.points} onChange={(event) => updateEditingSubscriptionForm('points', event.target.value)} className={inputClassName()} placeholder="Enter points" />
                    </Field>
                    <Field label="Tag" error={editingSubscriptionErrors.tag}>
                      <ThemedDropdown
                        value={editingSubscriptionForm.tag}
                        onChange={(value) => updateEditingSubscriptionForm('tag', value ?? '')}
                        options={packageTagOptions}
                        placeholder="No tag"
                        showPlaceholderOption
                        placement="top"
                      />
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
                <Field label="Label" error={subscriptionErrors.name} hint={<LabelLengthHint value={subscriptionForm.name} />} required>
                  <input value={subscriptionForm.name} onChange={(event) => handleSubscriptionChange('name', event.target.value)} className={inputClassName()} placeholder="Enter label" maxLength={PACKAGE_LABEL_MAX_LENGTH} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Storage (GB)" error={subscriptionErrors.storageLimit} required>
                    <input inputMode="numeric" value={subscriptionForm.storageLimit} onChange={(event) => handleSubscriptionChange('storageLimit', event.target.value)} className={inputClassName()} placeholder="Enter storage (GB)" />
                  </Field>
                  <Field label="Price (USD)" error={subscriptionErrors.amount} required>
                    <input inputMode="decimal" value={subscriptionForm.amount} onChange={(event) => updatePriceIfValid(event.target.value, (value) => handleSubscriptionChange('amount', value))} className={inputClassName()} placeholder="Enter price (USD)" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Time Period" required>
                    <ThemedDropdown
                      value={subscriptionForm.timePeriod}
                      onChange={(value) => handleSubscriptionChange('timePeriod', value ?? 'month')}
                      options={subscriptionTimePeriodOptions}
                      placeholder="Select time period"
                    />
                  </Field>
                  <Field label="Status" required>
                    <ThemedDropdown
                      value={subscriptionForm.status}
                      onChange={(value) => handleSubscriptionChange('status', value ?? 'Active')}
                      options={subscriptionStatusOptions}
                      placeholder="Select status"
                    />
                  </Field>
                  <Field label="Points" error={subscriptionErrors.points}>
                    <input inputMode="numeric" value={subscriptionForm.points} onChange={(event) => handleSubscriptionChange('points', event.target.value)} className={inputClassName()} placeholder="Enter points" />
                  </Field>
                  <Field label="Tag" error={subscriptionErrors.tag}>
                    <ThemedDropdown
                      value={subscriptionForm.tag}
                      onChange={(value) => handleSubscriptionChange('tag', value ?? '')}
                      options={packageTagOptions}
                      placeholder="No tag"
                      showPlaceholderOption
                      placement="top"
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea value={subscriptionForm.description} onChange={(event) => handleSubscriptionChange('description', event.target.value)} className={`${inputClassName()} min-h-28 resize-none`} placeholder="Add description..." />
                </Field>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={saveSubscriptionPackage} disabled={pendingAction === 'create-storage'} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
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
      {deleteTarget ? (
        <DeleteConfirmationModal
          packageName={deleteTarget.name}
          isDeleting={pendingAction === `delete-${deleteTarget.id}`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeletePackage}
        />
      ) : null}
      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </section>
  );
}
