"use client";
/**
 * A chunky dropdown for picking one place from a short list: the chosen one on a tall, lime-tinted button
 * (its picture, name and a line under it), the rest in the list it opens, the chosen one ticked, and
 * an optional action last (e.g. "Draw area"). Knows nothing about what the places are: the caller
 * builds the options. Rows are ListRows.
 */
import { Check, ChevronDown, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ListRow } from "./list-row";

interface PickerOption {
  key: string;
  /** Its picture, at this size in px: 56 on the button, 52 in the list. */
  lead: (size: number) => ReactNode;
  title: string;
  subtitle?: string | undefined;
}

// A row as a button: the picture, then the name and its line, then a chevron or tick (full strength, not ListRow's faded icons).
const rowButton = "text-[var(--cn-green-800)] [&>svg:last-child]:opacity-100 [&_[data-slot=title]]:font-bold";

export function AreaPicker({ options, value, onChange, label, buttonLabel, footer, className }: {
  options: readonly PickerOption[];
  /** The chosen option's key. */
  value: string;
  onChange: (key: string) => void;
  /** What the list is, for screen readers, e.g. "Where the plants went". */
  label: string;
  /** The button's name for screen readers; by default "{title}, {subtitle}: change". */
  buttonLabel?: string | undefined;
  /** A last row that does something rather than picks, e.g. { label: "Draw area", onClick }; a + unless given an icon. */
  footer?: { label: string; onClick: () => void; icon?: ReactNode | undefined } | undefined;
  /** On the button, e.g. a margin. */
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.key === value) ?? options[0];
  if (!chosen) return null;
  const close = (fn: () => void) => () => { setOpen(false); fn(); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ListRow
          lead={chosen.lead(56)} title={chosen.title} subtitle={chosen.subtitle}
          end={<ChevronDown size={20} strokeWidth={2.4} aria-hidden="true" />}
          aria-label={buttonLabel ?? `${chosen.title}${chosen.subtitle ? `, ${chosen.subtitle}` : ""}: change`}
          className={cn(
            rowButton,
            "min-h-[72px] gap-3.5 rounded-[var(--radius-stat)] border-[1.5px] border-solid border-[var(--cn-green-800)] bg-[var(--surface-picked)] py-2.5 pl-3 pr-4",
            "hover:bg-[#e9f0d8] data-[state=open]:bg-[#e9f0d8] focus-visible:rounded-[var(--radius-stat)]",
            "[&_[data-slot=title]]:text-[17px] [&_[data-slot=subtitle]]:text-[13.5px]",
            // open: the chevron points up
            "[&>svg:last-child]:transition-transform [&>svg:last-child]:duration-200 data-[state=open]:[&>svg:last-child]:rotate-180 motion-reduce:[&>svg:last-child]:transition-none",
            className,
          )}
        />
      </PopoverTrigger>
      {/* The global .cn-popover sets its own corners and shadow, unlayered: these need the ! to win. */}
      <PopoverContent
        aria-label={label}
        className="z-[60] max-h-[min(420px,60vh)] w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-[var(--radius-stat)]! border border-[var(--border-card)] bg-[var(--surface-card)] p-1.5 shadow-[0_16px_40px_rgba(21,38,28,0.22)]!"
      >
        {options.map((o) => (
          <ListRow
            key={o.key} lead={o.lead(52)} title={o.title} subtitle={o.subtitle} aria-pressed={o.key === chosen.key}
            end={o.key === chosen.key ? <Check size={18} strokeWidth={2.6} aria-hidden="true" /> : undefined}
            onClick={close(() => onChange(o.key))}
            className={cn(
              rowButton,
              "min-h-16 rounded-[var(--radius-field)] py-2 pl-2 pr-3 hover:bg-[var(--surface-hover)] aria-pressed:bg-[var(--surface-hover)]",
              "focus-visible:rounded-[var(--radius-field)] focus-visible:outline-offset-[-2px] [&_[data-slot=title]]:text-[16.5px]",
            )}
          />
        ))}
        {footer && (
          <button
            type="button" onClick={close(footer.onClick)}
            className="mt-1 flex min-h-[52px] w-full cursor-pointer items-center gap-2.5 rounded-b-[var(--radius-field)] border-0 border-t border-solid border-[var(--border-card)] bg-transparent pl-4 pr-3 text-left font-sans text-[15px] font-bold text-[var(--cn-green-800)] hover:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--cn-green-800)]"
          >
            {footer.icon ?? <Plus size={18} strokeWidth={2.6} aria-hidden="true" />}{footer.label}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
