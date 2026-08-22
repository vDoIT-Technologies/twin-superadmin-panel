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

export function normalizeStorageUsage(payload) {
  const data = payload?.data ?? payload ?? {};
  const quota = data.filebaseQuota ?? data.filebase ?? data.total ?? data;
  const quotaBytes = firstNumber(
    quota.totalQuotaBytes, quota.totalQuotaInBytes, quota.totalQuota,
    quota.storageLimitBytes, quota.storageLimit, quota.quotaBytes, quota.quota,
    quota.total_quota_bytes, quota.storage_limit_bytes, quota.quota_bytes,
  );
  const quotaTb = firstNumber(quota.totalQuotaTB, quota.totalQuotaTb, quota.quotaTB, quota.quotaTb);
  const quotaGb = firstNumber(quota.totalQuotaGB, quota.totalQuotaGb, quota.quotaGB, quota.quotaGb);
  const usageBytes = firstNumber(
    quota.totalUsageBytes, quota.totalUsageInBytes, quota.totalUsage,
    quota.storageUsedBytes, quota.storageUsed, quota.usedBytes, quota.usage, quota.used,
    quota.total_usage_bytes, quota.storage_used_bytes, quota.used_bytes,
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
    quota.usage_percentage, quota.usage_percent, quota.quota_used_percentage,
    quota.quota_percent, quota.percentage_used, quota.percent_used,
  );

  const totalQuota = quotaTb != null ? quotaTb * BYTES_PER_TB : quotaGb != null ? quotaGb * BYTES_PER_GB : quotaBytes;
  const totalUsage = usageTb != null ? usageTb * BYTES_PER_TB : usageGb != null ? usageGb * BYTES_PER_GB : usageBytes;
  const usagePercent = percentage ?? (totalQuota > 0 && totalUsage != null ? (totalUsage / totalQuota) * 100 : null);

  return {
    totalQuota,
    totalUsage,
    usagePercent: usagePercent == null ? null : Math.min(100, Math.max(0, usagePercent)),
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
    clientId: user.clientId ?? client?.id ?? client?._id ?? null,
    name: user.name?.trim() || user.userName?.trim() || user.email || 'Unknown user',
    email: user.email ?? '',
    client: typeof clientName === 'string' && clientName != 'Unassigned' ? clientName.trim() : '---',
    env: rawEnv === 'development' ? 'dev' : rawEnv === 'production' ? 'prod' : rawEnv,
    storageBytes: getTopUserStorageBytes(user),
    storageMB: user.storageMB ?? 0,
    files: firstNumber(user.files, user.fileCount, user.filesCount, user.totalFiles, user.twinPoints) ?? 0,
    lastActive: user.lastActive ?? user.lastActiveAt ?? user.lastActiveDate ?? user.updatedAt,
  };
}

export function normalizeStorageClient(client, index) {
  const details = client.client && typeof client.client === 'object' ? client.client : {};
  const clientId = client.clientId
    ?? client.clientID
    ?? client.client_id
    ?? client.id
    ?? client._id
    ?? details.clientId
    ?? details.id
    ?? details._id
    ?? null;
  const storageTb = firstNumber(
    client.storageTB, client.storageTb, client.storageInTB, client.totalStorageTB, client.totalStorageTb,
  );
  const storageGb = firstNumber(
    client.storageGB, client.storageGb, client.storageInGB, client.totalStorageGB,
    client.totalStorageGb, client.totalStorageInGB, client.usedGB,
  );
  const storageBytes = firstNumber(client.storageBytes, client.totalStorageBytes, client.storageUsedBytes);
  const rawStorage = client.storage ?? client.totalStorage;
  const parsedStorage = typeof rawStorage === 'string'
    ? rawStorage.trim().match(/^([\d.]+)\s*(TB|GB|MB|KB|B)?$/i)
    : null;
  const parsedStorageGb = parsedStorage
    ? Number(parsedStorage[1]) * ({ TB: 1024, GB: 1, MB: 1 / 1024, KB: 1 / 1024 ** 2, B: 1 / BYTES_PER_GB }[parsedStorage[2]?.toUpperCase() ?? 'GB'])
    : firstNumber(rawStorage);
  const activeValue = client.isActive ?? client.active ?? details.isActive ?? details.active;
  const statusValue = client.clientStatus ?? client.status ?? details.status
    ?? (activeValue == null ? 'inactive' : activeValue ? 'active' : 'inactive');
  const envValue = String(client.env ?? client.environment ?? client.__env ?? 'dev').toLowerCase();

  return {
    id: clientId == null ? null : String(clientId),
    rank: firstNumber(client.rank) ?? index + 1,
    name: client.clientName ?? client.name ?? client.companyName ?? details.name ?? details.companyName ?? 'Unknown client',
    status: String(statusValue).toLowerCase() === 'active' ? 'active' : 'inactive',
    env: envValue === 'development' ? 'dev' : envValue === 'production' ? 'prod' : envValue,
    storageGb: storageGb ?? (storageTb != null ? storageTb * 1024 : storageBytes != null ? storageBytes / BYTES_PER_GB : parsedStorageGb ?? 0),
    files: firstNumber(client.files, client.fileCount, client.filesCount, client.totalFiles) ?? 0,
  };
}

export function formatStorageGb(value) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0)} GB`;
}

export function sortTopUsers(users, { key, direction }) {
  const valueFor = (user) => ({
    user: user.name || '', client: user.client || '', env: user.env || '',
    storage: user.storageBytes, files: user.files,
  })[key] ?? user.storageBytes;

  return [...users].sort((left, right) => {
    const a = valueFor(left);
    const b = valueFor(right);
    if (typeof a === 'number' && typeof b === 'number') return direction === 'asc' ? a - b : b - a;
    return direction === 'asc' ? String(a).localeCompare(String(b)) : String(b).localeCompare(String(a));
  });
}

export function exportTopUsersCsv(users) {
  const header = ['User', 'Email', 'Client', 'Env', 'Storage', 'Files'];
  const rows = users.map((user) => [
    user.name, user.email, user.client, user.env, formatBytes(user.storageBytes),
    user.files,
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
