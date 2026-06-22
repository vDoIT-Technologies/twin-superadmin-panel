import { createContext, useMemo, useState } from 'react';
import { defaultDemoFilters } from '../demo-data/superadminSelectors';

export const FilterContext = createContext({
  filters: defaultDemoFilters,
  setFilters: () => {},
});

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(defaultDemoFilters);
  const value = useMemo(() => ({ filters, setFilters }), [filters]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
