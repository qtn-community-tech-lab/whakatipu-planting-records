import { cn } from "@/lib/utils";

/** A small segmented choice: a radio group of equal-width options in one row, the chosen one raised.
 * One tab stop (the chosen option); the arrow keys move the choice, as in any radio group. */
export function Segmented<T extends string>({ label, options, value, onChange, className }: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
  className?: string | undefined;
}) {
  return (
    <div
      role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      className={cn("grid gap-[3px] rounded-[var(--radius-field)] bg-[var(--surface-soft)] p-1", className)}
      onKeyDown={(e) => {
        const by = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!by) return;
        e.preventDefault();
        const i = (options.findIndex(([key]) => key === value) + by + options.length) % options.length;
        onChange(options[i]![0]);
        (e.currentTarget.children[i] as HTMLElement | undefined)?.focus();
      }}
    >
      {options.map(([key, text]) => (
        <button
          key={key} type="button" role="radio" aria-checked={key === value} tabIndex={key === value ? 0 : -1} onClick={() => onChange(key)}
          className={cn(
            "min-h-10 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--radius-inset)] border-0 bg-transparent px-2",
            "font-sans text-[13.5px] font-semibold leading-[normal] text-[var(--text-body)]",
            "aria-checked:bg-[var(--surface-card)] aria-checked:font-bold aria-checked:text-[var(--text-strong)] aria-checked:shadow-[0_2px_6px_rgba(21,38,28,0.12)]",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
