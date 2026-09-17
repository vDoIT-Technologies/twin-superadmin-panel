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

function ScopeDropdown({ filterKey, filters, updateScopeFilter, options, placeholder, searchPlaceholder, tone, ...props }) {
  return (
    <div className="min-w-0">
      <FilterDropdown
        value={filters[filterKey]}
        onChange={(value) => updateScopeFilter(filterKey, value)}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        tone={tone}
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
  vendorOptions,
  showOverviewControls,
  adminProduct,
  visibleScopes = ['granularity', 'client', 'twin', 'user', 'service', 'vendor'],
  showEnvironment = true,
}) {
  const isVault = adminProduct === 'vault';
  const isVisible = (scope) => visibleScopes.includes(scope);
  const visibleCount = visibleScopes.filter((scope) => scope !== 'service' && (scope !== 'twin' || !isVault)).length;
  const desktopGridClass = {
    1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
  }[visibleCount] || 'xl:grid-cols-6';
  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          {showEnvironment ? <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-start">
            <span className="text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-400 sm:mr-1 sm:text-left">Environment</span>
            <div className="flex max-w-full items-center justify-center gap-1.5 overflow-x-auto px-1 py-0.5 no-scrollbar">
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
          </div> : null}

          <div className={`grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 ${desktopGridClass} ${showEnvironment ? '' : 'lg:ml-auto lg:max-w-xl'}`}>
            {isVisible('granularity') ? <div className="min-w-0">
              <FilterDropdown
                value={filters.gran}
                onChange={(value) => updateFilters({ gran: value ?? 'day' })}
                options={GRANULARITIES}
                placeholder="By Days"
                searchable={false}
                showPlaceholderOption={false}
                tone={isVault ? 'vault' : 'twin'}
              />
            </div> : null}
            {isVisible('client') ? <ScopeDropdown tone={isVault ? 'vault' : 'twin'} filterKey="client" filters={filters} updateScopeFilter={updateScopeFilter} options={clientOptions} placeholder="All clients" searchPlaceholder="Search client..." /> : null}
            {!isVault && isVisible('twin') ? <ScopeDropdown filterKey="twin" filters={filters} updateScopeFilter={updateScopeFilter} options={twinOptions} placeholder="All twins" searchPlaceholder="Search twin..." align="right" /> : null}
            {isVisible('user') ? <ScopeDropdown tone={isVault ? 'vault' : 'twin'} filterKey="user" filters={filters} updateScopeFilter={updateScopeFilter} options={userOptions} placeholder="All users" searchPlaceholder="Search user..." /> : null}
            {isVisible('vendor') ? <ScopeDropdown tone={isVault ? 'vault' : 'twin'} filterKey="vendor" filters={filters} updateScopeFilter={updateScopeFilter} options={vendorOptions} placeholder="All services" searchPlaceholder="Search service..." align="right" /> : null}
          </div>
        </div>
      </div>

      {showOverviewControls ? (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex w-full flex-wrap items-center justify-center gap-2.5 sm:w-auto sm:justify-start">
            <div className="flex h-9 shrink-0 items-center rounded-full border border-slate-200 bg-white p-1 shadow-2xs" aria-label="Time range">
              {RANGES.map((range) => (
                <button key={range} type="button" aria-pressed={filters.range === range} className={`h-7 rounded-full px-3 text-xs font-semibold transition ${filters.range === range ? `${isVault ? 'bg-emerald-600' : 'bg-indigo-600'} text-white shadow-xs` : 'text-slate-500 hover:text-slate-800'}`} onClick={() => updateFilters({ range })}>{range}</button>
              ))}
            </div>

            <button type="button" aria-pressed={filters.compare} className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold shadow-2xs transition ${filters.compare ? (isVault ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-indigo-400 bg-indigo-50 text-indigo-700') : (isVault ? 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700')}`} onClick={() => updateFilters({ compare: !filters.compare })}>
              <Columns2 size={15} />
              Compare
            </button>
          </div>

          <div className="flex h-10 w-full shrink-0 items-center rounded-full border border-slate-200 bg-white p-1 shadow-2xs sm:h-9 sm:w-auto" aria-label="Overview metric">
            {LENSES.map((lens) => (
              <button key={lens.id} type="button" aria-pressed={filters.lens === lens.id} className={`h-8 flex-1 rounded-full px-3 text-xs font-semibold transition sm:h-7 sm:flex-none ${filters.lens === lens.id ? (isVault ? 'bg-emerald-100 font-bold text-emerald-800 shadow-xs' : 'bg-indigo-100 font-bold text-indigo-800 shadow-xs') : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`} onClick={() => updateFilters({ lens: lens.id })}>
                {lens.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
