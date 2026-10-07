import { useState, useRef, useEffect } from 'react';

export function TruncatedText({ value, className = '', breakMode = 'ellipsis' }) {
  const text = value == null ? '' : String(value);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const innerClass =
    breakMode === 'words'
      ? 'block min-w-0 break-words'
      : breakMode === 'all'
        ? 'block min-w-0 break-all'
        : 'block min-w-0 truncate';

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = () => hide();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll, true);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll, true);
    };
  }, [open]);

  return (
    <>
      <span
        ref={ref}
        className={`group relative inline-block min-w-0 max-w-full align-bottom ${className}`}
        aria-label={text || undefined}
        tabIndex={text ? 0 : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <span className={innerClass}>{text}</span>
      </span>

      {open && text ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full -translate-y-2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 text-white shadow-lg break-all"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </span>
      ) : null}
    </>
  );
}