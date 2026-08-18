export function getStatusTone(status) {
  const value = status.toLowerCase();

  if (['healthy', 'active', 'good'].includes(value)) return 'success';
  if (['watch', 'pending', 'trial', 'warn'].includes(value)) return 'warning';
  return 'danger';
}

export function normalizeEntityStatus(status, explicitActive) {
  if (typeof status === 'boolean') return status ? 'active' : 'inactive';
  if (typeof explicitActive === 'boolean') return explicitActive ? 'active' : 'inactive';
  if (typeof status !== 'string') return '';

  const value = status.trim().toLowerCase();
  if (['active', 'enabled', 'online', 'true'].includes(value)) return 'active';
  if (['inactive', 'disabled', 'offline', 'false'].includes(value)) return 'inactive';
  return '';
}
