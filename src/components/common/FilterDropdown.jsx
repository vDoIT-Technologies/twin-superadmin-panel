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
    <div ref={rootRef} className={`filter-dropdown${open ? ' open' : ''}${selected ? ' has-value' : ''}`}>
      <div className="filter-select-control">
        <button
          type="button"
          className="filter-select-button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span className="filter-select-label">{selected?.buttonLabel ?? selected?.label ?? placeholder}</span>
          {!canClear ? <ChevronDown size={14} className="filter-select-caret" /> : null}
        </button>
        {canClear ? (
          <button
            type="button"
            className="filter-select-clear"
            aria-label={`Clear ${selected.label}`}
            onClick={clearSelection}
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

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
            {showPlaceholderOption ? (
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
            ) : null}

            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-dropdown-item${String(option.value) === String(value) ? ' selected' : ''}`}
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
