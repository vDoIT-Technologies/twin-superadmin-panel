export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMetricValue(value, suffix = '') {
  if (typeof value === 'number' && value >= 1000 && !suffix) {
    return formatCompactNumber(value);
  }

  return `${value}${suffix}`;
}
