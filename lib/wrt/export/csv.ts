/** Spreadsheet-safe CSV text and dated file names for the staff data export. */
import { todayInNz } from "@/lib/wrt/events/season";

/** Quote for CSV, and defuse spreadsheet formulas in text that starts with = + @. */
export function csvField(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A value in one CSV cell. Null and undefined are written blank, which means unknown. */
export type Cell = string | number | boolean | null | undefined;

const text = (value: Cell) => (typeof value === "boolean" ? (value ? "Yes" : "No") : value);

/** UTF-8 with a BOM so Excel keeps macrons, CRLF line ends, every value quoted and defused by csvField. */
export function toCsv(headers: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map((value) => csvField(text(value))).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** wrt-planting-lines-2026-11-16: a download's name with the day it was exported in New Zealand. */
export function exportName(name: string, now = new Date()): string {
  return `wrt-${name.replaceAll("_", "-")}-${todayInNz(now)}`;
}
