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
    <div className="min-w-0">
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
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex shrink-0 items-center gap-2">
            <span className="mr-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Environment</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              {ENVIRONMENTS.map((option) => {
                const active = filters.envs.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-2xs transition hover:-translate-y-px ${active ? 'ring-2 ring-offset-1' : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200'} ${option.id === 'dev' && active ? 'bg-slate-500 text-white ring-slate-200' : ''} ${option.id === 'staging' && active ? 'bg-sky-500 text-white ring-sky-100' : ''} ${option.id === 'prod' && active ? 'bg-indigo-600 text-white ring-indigo-100' : ''}`}
                    onClick={() => {
                      const envs = active ? filters.envs.filter((id) => id !== option.id) : [...filters.envs, option.id];
                      if (envs.length) updateFilters({ envs });
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="min-w-0">
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
            <ScopeDropdown filterKey="twin" filters={filters} updateScopeFilter={updateScopeFilter} options={twinOptions} placeholder="All twins" searchPlaceholder="Search twin..." align="right" />
            <ScopeDropdown filterKey="user" filters={filters} updateScopeFilter={updateScopeFilter} options={userOptions} placeholder="All users" searchPlaceholder="Search user..." />
            <ScopeDropdown filterKey="service" filters={filters} updateScopeFilter={updateScopeFilter} options={serviceOptions} placeholder="All services" searchPlaceholder="Search service..." align="right" />
            <ScopeDropdown filterKey="vendor" filters={filters} updateScopeFilter={updateScopeFilter} options={vendorOptions} placeholder="All vendors" searchPlaceholder="Search vendor..." align="right" />
          </div>
        </div>
      </div>

      {showOverviewControls ? (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 shrink-0 items-center rounded-full border border-slate-200 bg-white p-1 shadow-2xs">
              {RANGES.map((range) => (
                <button key={range} type="button" className={`h-7 rounded-full px-3 text-xs font-semibold transition ${filters.range === range ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`} onClick={() => updateFilters({ range })}>{range}</button>
              ))}
            </div>

            <button type="button" className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold shadow-2xs transition ${filters.compare ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'}`} onClick={() => updateFilters({ compare: !filters.compare })}>
              <Columns2 size={15} />
              Compare
            </button>
          </div>

          <div className="flex h-9 shrink-0 items-center rounded-full border border-slate-200 bg-white p-1 shadow-2xs">
            {LENSES.map((lens) => (
              <button key={lens.id} type="button" className={`h-7 rounded-full px-3 text-xs font-semibold transition ${filters.lens === lens.id ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => updateFilters({ lens: lens.id })}>
                {lens.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
