"use client";
/**
 * A search box: a magnifier, the input, and × to clear once something is typed. Before anything
 * is typed, `children` sits where the × goes (e.g. a camera button). The keyboard leaves what's
 * typed alone (names are often Māori or Latin), and its Enter key reads "Search".
 */
import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "children"> & {
  /** For screen readers; the placeholder shows it on screen. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown in place of the clear button while the box is empty. */
  children?: ReactNode;
};

export function SearchField({ label, value, onChange, children, className, ...input }: Props) {
  return (
    <label
      className={cn(
        "flex min-h-12 items-center gap-2.5 rounded-[var(--radius-field)] [border:var(--border-input)] bg-[var(--surface-card)] pl-3.5 pr-1.5 text-[var(--text-eyebrow)]",
        "focus-within:border-[var(--cn-green-800)] focus-within:shadow-[0_0_0_3px_rgba(31,77,52,0.12)]",
        className,
      )}
    >
      <Search size={18} strokeWidth={2.2} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-[16px] leading-normal font-medium text-[var(--text-strong)] outline-none [&::-webkit-search-cancel-button]:hidden"
        type="search" value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="none" enterKeyHint="search" {...input}
      />
      {value
        ? <button
            type="button" aria-label="Clear search" onClick={() => onChange("")}
            className="size-9 shrink-0 cursor-pointer rounded-full border-0 bg-[var(--surface-soft)] font-sans text-lg/none font-semibold text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cn-green-800)]"
          >×</button>
        : children}
    </label>
  );
}
