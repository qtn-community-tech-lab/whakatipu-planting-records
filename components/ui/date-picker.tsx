"use client";
/**
 * A button that opens a month calendar in a popover (shadcn's Date Picker: Popover + react-day-picker).
 * Dates are "YYYY-MM-DD", like <input type="date">. Works where a native picker can't be opened
 * from a button (iOS Safari ignores showPicker() on a hidden input).
 */
import { useState, type ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import s from "./date-picker.module.css";

type Props = Omit<ComponentProps<"button">, "value" | "onChange"> & {
  value: string;
  /** The earliest date that can be chosen. */
  min?: string;
  /** The latest date that can be chosen. */
  max?: string;
  onChange: (value: string) => void;
};

export function DatePicker({ value, min, max, onChange, ...trigger }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromIso(value) : undefined;
  const first = min ? fromIso(min) : undefined;
  const last = max ? fromIso(max) : undefined;
  // With nothing chosen it opens on the latest month allowed (this month, or the end of a past range).
  const month = selected ?? last;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger type="button" {...trigger} />
      <PopoverContent align="end" collisionPadding={12} className={s.content}>
        <DayPicker
          // Always six weeks, so the popover never changes height and the arrows stay under your finger.
          mode="single" required weekStartsOn={1} autoFocus fixedWeeks showOutsideDays
          selected={selected} {...(month && { defaultMonth: month })}
          {...(first && { startMonth: first })} {...(last && { endMonth: last })}
          {...((first || last) && { disabled: [...(first ? [{ before: first }] : []), ...(last ? [{ after: last }] : [])] })}
          onSelect={(d) => { onChange(toIso(d)); setOpen(false); }}
        />
      </PopoverContent>
    </Popover>
  );
}

// Local dates both ways, so a NZ morning isn't the day before in UTC.
const fromIso = (iso: string) => {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
