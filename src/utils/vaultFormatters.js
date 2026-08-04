const BYTES_PER_GB = 1024 ** 3;
const BYTES_PER_TB = 1024 ** 4;

export function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (value !== '' && value != null && Number.isFinite(number)) return number;
  }
  return null;
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= BYTES_PER_TB) return `${(value / BYTES_PER_TB).toFixed(2)} TB`;
  if (value >= BYTES_PER_GB) return `${(value / BYTES_PER_GB).toFixed(2)} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${value} B`;
}

export function formatQuotaPercent(percent) {
  const value = Number(percent) || 0;
  return `${value < 1 && value > 0 ? value.toFixed(2) : value.toFixed(value ? 1 : 0)}%`;
}

export function formatLastActive(value) {
  if (!value) return '-';
  if (typeof value === 'string' && (/^\d+d ago$/i.test(value.trim()) || value.trim().toLowerCase() === 'today')) {
    return value.trim();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'today';
  return days === 1 ? '1d ago' : `${days}d ago`;
}

export function getUserInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function normalizeFilebaseQuota(payload) {
  const data = payload?.data ?? payload ?? {};
  const quota = data.filebaseQuota ?? data.filebase ?? data.total ?? data;
  const quotaBytes = firstNumber(
    quota.totalQuotaBytes, quota.totalQuotaInBytes, quota.totalQuota,
    quota.storageLimitBytes, quota.storageLimit, quota.quotaBytes, quota.quota,
  );
  const quotaTb = firstNumber(quota.totalQuotaTB, quota.totalQuotaTb, quota.quotaTB, quota.quotaTb);
  const quotaGb = firstNumber(quota.totalQuotaGB, quota.totalQuotaGb, quota.quotaGB, quota.quotaGb);
  const usageBytes = firstNumber(
    quota.totalUsageBytes, quota.totalUsageInBytes, quota.totalUsage,
    quota.storageUsedBytes, quota.storageUsed, quota.usedBytes, quota.usage, quota.used,
  );
  const usageTb = firstNumber(
    quota.totalUsageTB, quota.totalUsageTb, quota.usageTB, quota.usageTb, quota.usedTB, quota.usedTb,
  );
  const usageGb = firstNumber(
    quota.totalUsageGB, quota.totalUsageGb, quota.usageGB, quota.usageGb, quota.usedGB, quota.usedGb,
  );
  const percentage = firstNumber(
    quota.percentage, quota.usagePercentage, quota.usagePercent, quota.quotaUsedPercentage,
    quota.quotaPercent, quota.percentageUsed, quota.percentUsed,
  );

  return {
    totalQuota: quotaTb != null ? quotaTb * BYTES_PER_TB : quotaGb != null ? quotaGb * BYTES_PER_GB : quotaBytes,
    totalUsage: usageTb != null ? usageTb * BYTES_PER_TB : usageGb != null ? usageGb * BYTES_PER_GB : usageBytes,
    usagePercent: percentage == null ? null : Math.min(100, Math.max(0, percentage)),
  };
}

export function getTopUserStorageBytes(user) {
  const storageTb = firstNumber(user.storageTB, user.storageTb);
  if (storageTb != null && storageTb > 0) return storageTb * BYTES_PER_TB;
  const storageGb = firstNumber(user.storageGB, user.storageGb);
  if (storageGb != null) return storageGb * BYTES_PER_GB;
  if (storageTb === 0) return 0;

  const rawStorage = user.storageBytes ?? user.storageUsedBytes ?? user.storageUsed ?? user.storage ?? 0;
  if (typeof rawStorage === 'string') {
    const match = rawStorage.trim().match(/^([\d.]+)\s*(TB|GB|MB|KB|B)?$/i);
    if (match) {
      const multipliers = { TB: BYTES_PER_TB, GB: BYTES_PER_GB, MB: 1024 ** 2, KB: 1024, B: 1 };
      return Number(match[1]) * multipliers[match[2]?.toUpperCase() ?? 'B'];
    }
  }
  return firstNumber(rawStorage) ?? 0;
}

export function normalizeTopUser(user) {
  const client = user.client;
  const rawEnv = String(user.env ?? user.environment ?? user.__env ?? 'dev').toLowerCase();
  const clientName = user.clientName ?? (typeof client === 'string' ? client : client?.name) ?? user.clientId ?? '-';
  return {
    id: user.id ?? user._id ?? user.userId,
    name: user.name?.trim() || user.userName?.trim() || user.email || 'Unknown user',
    email: user.email ?? '',
    client: typeof clientName === 'string' ? clientName.trim() : clientName,
    env: rawEnv === 'development' ? 'dev' : rawEnv === 'production' ? 'prod' : rawEnv,
    storageBytes: getTopUserStorageBytes(user),
    files: firstNumber(user.files, user.fileCount, user.filesCount, user.totalFiles, user.twinPoints) ?? 0,
    lastActive: user.lastActive ?? user.lastActiveAt ?? user.lastActiveDate ?? user.updatedAt,
  };
}

export function sortTopUsers(users, { key, direction }) {
  const valueFor = (user) => ({
    user: user.name || '', client: user.client || '', env: user.env || '',
    storage: user.storageBytes, files: user.files,
    lastActive: new Date(user.lastActive).getTime() || 0,
  })[key] ?? user.storageBytes;

  return [...users].sort((left, right) => {
    const a = valueFor(left);
    const b = valueFor(right);
    if (typeof a === 'number' && typeof b === 'number') return direction === 'asc' ? a - b : b - a;
    return direction === 'asc' ? String(a).localeCompare(String(b)) : String(b).localeCompare(String(a));
  });
}

export function exportTopUsersCsv(users) {
  const header = ['User', 'Email', 'Client', 'Env', 'Storage', 'Files', 'Last Active'];
  const rows = users.map((user) => [
    user.name, user.email, user.client, user.env, formatBytes(user.storageBytes),
    user.files, formatLastActive(user.lastActive),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'top-users-by-storage.csv';
  link.click();
  URL.revokeObjectURL(url);
}
