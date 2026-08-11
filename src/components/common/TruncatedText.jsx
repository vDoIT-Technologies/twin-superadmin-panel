export function TruncatedText({ value, maxLength = 20, className = '' }) {
  const text = value == null ? '' : String(value);
  const isLong = text.length > maxLength;
  const displayedText = isLong ? `${text.slice(0, maxLength)}....` : text;

  return (
    <span className={`inline-block max-w-full align-bottom ${className}`} title={isLong ? text : undefined} aria-label={text || undefined}>
      {displayedText}
    </span>
  );
}
