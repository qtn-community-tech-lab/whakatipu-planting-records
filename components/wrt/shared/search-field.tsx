"use client";
/**
 * A search box: a magnifier, the input, and × to clear once something is typed. Before anything
 * is typed, `children` sits where the × goes (e.g. a camera button). The keyboard leaves what's
 * typed alone (names are often Māori or Latin), and its Enter key reads "Search".
 */
import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import s from "./search-field.module.css";

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
    <label className={cn(s.search, className)}>
      <Search size={18} strokeWidth={2.2} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search" value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="none" enterKeyHint="search" {...input}
      />
      {value
        ? <button type="button" className={s.clear} aria-label="Clear search" onClick={() => onChange("")}>×</button>
        : children}
    </label>
  );
}
