export function TruncatedText({ value, maxLength = 20, className = '' }) {
  const text = value == null ? '' : String(value);
  const isLong = text.length > maxLength;
  const displayedText = isLong ? `${text.slice(0, maxLength)}....` : text;

  return (
    <span
      className={`group relative inline-block max-w-full align-bottom ${className}`}
      aria-label={text || undefined}
      tabIndex={isLong ? 0 : undefined}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{displayedText}</span>
      {isLong ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-max max-w-[min(24rem,calc(100vw-2rem))] rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 whitespace-normal text-white shadow-lg break-all group-hover:block group-focus:block"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
