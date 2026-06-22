import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export function FilterDropdown({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  searchable = true,
  align = 'left',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const normalized = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.meta?.toLowerCase().includes(normalized),
    );
  }, [options, query, searchable]);

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
    <div ref={rootRef} className={`filter-dropdown${open ? ' open' : ''}`}>
      <button
        type="button"
        className="filter-select-button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.buttonLabel ?? selected?.label ?? placeholder}</span>
        <ChevronDown size={14} className="filter-select-caret" />
      </button>

      {open ? (
        <div className={`filter-dropdown-panel filter-dropdown-panel-${align}`}>
          {searchable ? (
            <label className="filter-dropdown-search">
              <Search size={14} className="filter-dropdown-search-icon" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </label>
          ) : null}

          <div className="filter-dropdown-list">
            <button
              type="button"
              className={`filter-dropdown-item${value == null ? ' selected' : ''}`}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <span className="filter-dropdown-item-label">{placeholder}</span>
            </button>

            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-dropdown-item${option.value === value ? ' selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="filter-dropdown-item-label">{option.label}</span>
                {option.meta ? <span className="filter-dropdown-item-meta">{option.meta}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
