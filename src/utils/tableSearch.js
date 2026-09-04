export function matchesTableSearch(query, values) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();

  if (!normalizedQuery) return true;

  return values.some((value) =>
    String(value ?? '').toLowerCase().includes(normalizedQuery),
  );
}

export const TABLE_SEARCH_DATASET_LIMIT = 10_000;

export function isNumericTableSearch(query) {
  const value = String(query ?? '')
    .trim()
    .replace(/^\$/, '')
    .replaceAll(',', '')
    .replace(/[kmb]$/i, '');

  return value !== '' && Number.isFinite(Number(value));
}
