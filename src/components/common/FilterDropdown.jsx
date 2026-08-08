import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export function FilterDropdown({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  searchable = true,
  align = 'left',
  showPlaceholderOption = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const uniqueOptions = useMemo(() => {
    const seen = new Set();

    return (Array.isArray(options) ? options : []).filter((option) => {
      if (option?.value == null || option.value === '') return false;
      const key = String(option.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  const selected = uniqueOptions.find((option) => String(option.value) === String(value)) ?? null;
  const canClear = Boolean(selected && showPlaceholderOption);

  const clearSelection = () => {
    onChange(null);
    setOpen(false);
  };

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return uniqueOptions;
    const normalized = query.trim().toLowerCase();
    return uniqueOptions.filter(
      (option) =>
        String(option.label ?? '').toLowerCase().includes(normalized) ||
        String(option.meta ?? '').toLowerCase().includes(normalized),
    );
  }, [query, searchable, uniqueOptions]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative min-w-0${open ? ' z-40' : ''}`}>
      <div className={`flex h-9 w-full items-center rounded-full border bg-white shadow-2xs transition-all duration-150 ${open ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'}`}>
        <button
          type="button"
          className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full px-3.5 text-left text-xs font-semibold outline-none transition ${selected ? 'text-indigo-600' : 'text-slate-700 hover:text-slate-900'}`}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span className="truncate">{selected?.buttonLabel ?? selected?.label ?? placeholder}</span>
          {!canClear ? <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} /> : null}
        </button>
        {canClear ? (
          <button
            type="button"
            className="mr-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-indigo-500 transition hover:bg-indigo-100 hover:text-indigo-700"
            aria-label={`Clear ${selected.label}`}
            onClick={clearSelection}
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className={`absolute z-50 mt-2 max-h-80 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {searchable ? (
            <label className="mb-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-400 focus-within:border-indigo-300 focus-within:bg-white">
              <Search size={14} className="shrink-0" />
              <input
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </label>
          ) : null}

          <div className="max-h-60 overflow-y-auto pr-0.5">
            {showPlaceholderOption ? (
              <button
                type="button"
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-medium transition hover:bg-indigo-50 hover:text-indigo-700 ${value == null ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600'}`}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <span>{placeholder}</span>
              </button>
            ) : null}

            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium transition hover:bg-indigo-50 hover:text-indigo-700 ${String(option.value) === String(value) ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600'}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {option.meta ? <span className="shrink-0 text-[11px] text-slate-400">{option.meta}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
