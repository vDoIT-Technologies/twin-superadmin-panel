import { Columns2 } from 'lucide-react';
import { FilterDropdown } from '../common/FilterDropdown';

const ENVIRONMENTS = [
  { id: 'dev', label: 'Dev' },
  { id: 'staging', label: 'Staging' },
  { id: 'prod', label: 'Prod' },
];
const RANGES = ['24h', '7d', '30d', '90d'];
const LENSES = [
  { id: 'cost', label: 'Overview' },
  { id: 'usage', label: 'Usage' },
  { id: 'economy', label: 'Economy' },
];
const GRANULARITIES = [
  { value: 'day', label: 'By Days' },
  { value: 'week', label: 'By Weeks' },
  { value: 'month', label: 'By Months' },
];

function ScopeDropdown({ filterKey, filters, updateScopeFilter, options, placeholder, searchPlaceholder, ...props }) {
  return (
    <div className="filter-group">
      <FilterDropdown
        value={filters[filterKey]}
        onChange={(value) => updateScopeFilter(filterKey, value)}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        {...props}
      />
    </div>
  );
}

export function FilterToolbar({
  filters,
  updateFilters,
  updateScopeFilter,
  clientOptions,
  twinOptions,
  userOptions,
  serviceOptions,
  vendorOptions,
  showOverviewControls,
}) {
  return (
    <>
      <div className={`filterbar filterbar-primary${showOverviewControls ? ' filterbar-primary-with-overview' : ''}`}>
        <div className="filter-group filter-group-environment">
          <span className="filter-label">Environment</span>
          {ENVIRONMENTS.map((option) => {
            const active = filters.envs.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                className={`filter-chip filter-chip-env filter-chip-env-${option.id}${active ? ' active' : ''}`}
                onClick={() => {
                  const envs = active ? filters.envs.filter((id) => id !== option.id) : [...filters.envs, option.id];
                  if (envs.length) updateFilters({ envs });
                }}
              >
                <span className="filter-chip-dot" aria-hidden="true" />{option.label}
              </button>
            );
          })}
        </div>

        {showOverviewControls ? (
          <div className="filter-group filter-group-range">
            {RANGES.map((range) => (
              <button key={range} type="button" className={`filter-chip${filters.range === range ? ' active' : ''}`} onClick={() => updateFilters({ range })}>{range}</button>
            ))}
          </div>
        ) : null}

        <div className="filter-scope-groups filter-scope-groups-primary">
          <div className="filter-group filter-group-granularity">
            <FilterDropdown
              value={filters.gran}
              onChange={(value) => updateFilters({ gran: value ?? 'day' })}
              options={GRANULARITIES}
              placeholder="By Days"
              searchable={false}
              showPlaceholderOption={false}
            />
          </div>
          <ScopeDropdown filterKey="client" filters={filters} updateScopeFilter={updateScopeFilter} options={clientOptions} placeholder="All clients" searchPlaceholder="Search client..." />
          <ScopeDropdown filterKey="twin" filters={filters} updateScopeFilter={updateScopeFilter} options={twinOptions} placeholder="All twins" searchPlaceholder="Search twin..." />
          <ScopeDropdown filterKey="user" filters={filters} updateScopeFilter={updateScopeFilter} options={userOptions} placeholder="All users" searchPlaceholder="Search user..." />
          <ScopeDropdown filterKey="service" filters={filters} updateScopeFilter={updateScopeFilter} options={serviceOptions} placeholder="All services" searchPlaceholder="Search service..." />
          <ScopeDropdown filterKey="vendor" filters={filters} updateScopeFilter={updateScopeFilter} options={vendorOptions} placeholder="All vendors" searchPlaceholder="Search vendor..." align="right" />
        </div>
      </div>

      {showOverviewControls ? (
        <div className="filterbar filterbar-secondary">
          <div className="filter-group">
            <button type="button" className={`filter-chip filter-chip-compare${filters.compare ? ' active' : ''}`} onClick={() => updateFilters({ compare: !filters.compare })}>
              <Columns2 size={15} />Compare
            </button>
          </div>
          <div className="filter-group filter-group-lens">
            {LENSES.map((lens) => (
              <button key={lens.id} type="button" className={`filter-chip filter-chip-lens${filters.lens === lens.id ? ' active' : ''}`} onClick={() => updateFilters({ lens: lens.id })}>
                {lens.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
