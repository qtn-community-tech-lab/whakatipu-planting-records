/** Map-pin glyph for a site or part, in whatever wrapper the list uses. */
export function Pin({ className }: { className: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z" />
        <circle cx="12" cy="9.8" r="2.3" />
      </svg>
    </span>
  );
}
