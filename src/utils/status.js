export function getStatusTone(status) {
  const value = status.toLowerCase();

  if (['healthy', 'active', 'good'].includes(value)) return 'success';
  if (['watch', 'pending', 'trial', 'warn'].includes(value)) return 'warning';
  return 'danger';
}
