/**
 * One row of a list: a round photo (or the title's first letter, or any `lead`, e.g. an area's outline), a title with a smaller line
 * under it, a figure on the right, and whatever comes last (a chevron, "Chosen", a box to type in).
 * With onClick it's a button. Other props go on the row itself, so a Radix trigger can use it
 * with asChild. The list around it draws the lines between rows.
 */
import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"button">, "title"> & {
  title: ReactNode;
  subtitle?: ReactNode | undefined;
  /** A round photo before the title; null shows `initial` instead. Leave out for neither. */
  photo?: { src: string; credit?: string | undefined; focalPoint?: string | undefined } | null | undefined;
  /** The letter shown when there's no photo. Defaults to the title's first letter. */
  initial?: string | undefined;
  /** With no photo, the letter's disc takes a soft colour picked from this (e.g. a species id), the same each time. Without it, grey. */
  tintKey?: string | undefined;
  /** Instead of a photo: any element before the title, e.g. an area's outline. */
  lead?: ReactNode | undefined;
  /** "sm": a 32px photo, for lists you read. "md": 44px, for lists you pick from. */
  size?: "sm" | "md" | undefined;
  /** The number on the right, formatted. */
  figure?: ReactNode | undefined;
  /** After the figure: a chevron, a "Chosen" label, an input. */
  end?: ReactNode | undefined;
};

/** Soft discs for a letter with no photo: pale ground, dark letter, in the canopy's greens and earth tones. */
const TINTS = [
  "bg-[var(--cn-sage-100)] text-[var(--cn-green-800)]", // green
  "bg-[#dcebd3] text-[#2f5e3e]", // fern
  "bg-[#ecf0d2] text-[#55601c]", // olive
  "bg-[var(--cn-sage-150)] text-[var(--cn-grey-700)]", // sage
  "bg-[#f4e4da] text-[#8a4a2c]", // clay
  "bg-[#e2edf0] text-[#2e5a68]", // sky
];
/** The same key always gets the same tint. */
function tintFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

const row = "flex min-h-[52px] items-center gap-3 py-1.5 font-sans text-[var(--text-strong)] [&>svg]:shrink-0 [&>svg]:opacity-60";
const button = "w-full cursor-pointer border-0 bg-transparent text-left focus-visible:rounded-[var(--radius-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cn-green-800)]";

export function ListRow({ title, subtitle, photo, initial, tintKey, lead, size = "sm", figure, end, className, onClick, ...rest }: Props) {
  const letter = initial ?? (typeof title === "string" ? title.charAt(0) : "");
  const inner = (
    <>
      {lead}
      {lead === undefined && photo !== undefined && (
        <span
          aria-hidden="true"
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden rounded-full font-extrabold leading-none",
            !photo && tintKey ? tintFor(tintKey) : "bg-[var(--surface-soft)] text-[rgba(21,38,28,0.5)]",
            size === "md" ? "size-11 text-[17px]" : "size-8 text-[13px]",
          )}
        >
          {photo
            ? <Image src={photo.src} alt="" fill sizes={size === "md" ? "44px" : "32px"} unoptimized title={photo.credit}
                style={{ objectFit: "cover", objectPosition: photo.focalPoint }} />
            : letter}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-slot="title" className="truncate text-[15px] font-bold leading-tight">{title}</span>
        {subtitle && <span data-slot="subtitle" className="truncate text-[13px] leading-snug text-[var(--text-muted)]">{subtitle}</span>}
      </span>
      {figure !== undefined && (
        <span data-slot="figure" className="shrink-0 text-right text-[15px] font-bold tabular-nums">{figure}</span>
      )}
      {end}
    </>
  );
  return onClick
    ? <button type="button" className={cn(row, button, className)} onClick={onClick} {...rest}>{inner}</button>
    : <div className={cn(row, className)} {...(rest as ComponentProps<"div">)}>{inner}</div>;
}
