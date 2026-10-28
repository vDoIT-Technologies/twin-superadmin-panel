import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { defaultDemoFilters } from '../demo-data/superadminSelectors';
import { useAuth } from './AuthContext';
export const FilterContext = createContext({
  filters: defaultDemoFilters,
  setFilters: () => { },
  entityFilters: {},
  setEntityFilters: () => { },
});

const buildDefaultEntityFilters = (env) => {
  const envs = env ? [env] : ['dev', 'staging', 'prod'];
  return {
    clients: { envs, entityRange: 'all', status: null },
    twins: { envs, entityRange: 'all', client: null, status: null },
    users: { envs, entityRange: 'all', client: null, status: null },
  };
};

export function FilterProvider({ children }) {
  const { appEnvironment } = useAuth();

  const [filters, setFilters] = useState(() => ({
    ...defaultDemoFilters,
    envs: appEnvironment ? [appEnvironment] : defaultDemoFilters.envs,
  }));
  const [entityFilters, setEntityFilters] = useState(() =>
    buildDefaultEntityFilters(appEnvironment),
  );

  const envSeededRef = useRef(Boolean(appEnvironment));
  useEffect(() => {
    if (envSeededRef.current || !appEnvironment) return;
    envSeededRef.current = true;

    setFilters((prev) => ({ ...prev, envs: [appEnvironment] }));
    setEntityFilters((prev) => ({
      clients: { ...prev.clients, envs: [appEnvironment] },
      twins: { ...prev.twins, envs: [appEnvironment] },
      users: { ...prev.users, envs: [appEnvironment] },
    }));
  }, [appEnvironment]);

  const value = useMemo(
    () => ({ filters, setFilters, entityFilters, setEntityFilters }),
    [entityFilters, filters],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

const DEFAULT_ENTITY_FILTERS = buildDefaultEntityFilters(null);

export function useEntityFilters(entity) {
  const { entityFilters, setEntityFilters } = useContext(FilterContext);
  const setFilters = useCallback((next) => {
    setEntityFilters((current) => {
      const existing = current[entity] ?? DEFAULT_ENTITY_FILTERS[entity];
      const nextValue = typeof next === 'function' ? next(existing) : next;
      return { ...current, [entity]: nextValue };
    });
  }, [entity, setEntityFilters]);

  return [entityFilters[entity] ?? DEFAULT_ENTITY_FILTERS[entity], setFilters];
}
