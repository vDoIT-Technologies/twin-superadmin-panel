import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { defaultDemoFilters } from '../demo-data/superadminSelectors';

export const FilterContext = createContext({
  filters: defaultDemoFilters,
  setFilters: () => {},
  entityFilters: {},
  setEntityFilters: () => {},
});

const defaultEntityFilters = {
  clients: { envs: ['dev', 'staging', 'prod'], entityRange: 'all', status: null },
  twins: { envs: ['dev', 'staging', 'prod'], entityRange: 'all', client: null, status: null },
  users: { envs: ['dev', 'staging', 'prod'], entityRange: 'all', client: null, status: null },
};

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(defaultDemoFilters);
  const [entityFilters, setEntityFilters] = useState(defaultEntityFilters);
  const value = useMemo(
    () => ({ filters, setFilters, entityFilters, setEntityFilters }),
    [entityFilters, filters],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useEntityFilters(entity) {
  const { entityFilters, setEntityFilters } = useContext(FilterContext);
  const setFilters = useCallback((next) => {
    setEntityFilters((current) => ({
      ...current,
      [entity]: typeof next === 'function' ? next(current[entity]) : next,
    }));
  }, [entity, setEntityFilters]);

  return [entityFilters[entity] ?? defaultEntityFilters[entity], setFilters];
}
