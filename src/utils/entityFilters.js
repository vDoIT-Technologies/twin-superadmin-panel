export function getEntityFilterParams(value) {
  return { filter: String(value || 'all') };
}
