import type { NextRequest } from "next/server";
import { getWrt } from "@/lib/wrt/server";
import { PRECISION_LABELS } from "@/lib/wrt/review-themes";
import { parseRecordParams } from "@/components/wrt/explore/filters";

const HEADERS = [
  "Season",
  "Year",
  "Site",
  "Parcel",
  "Species (common name)",
  "Botanical name",
  "Recorded plants",
  "Needs review",
  "Review notes",
  "Confidence",
  "Precision",
  "Source workbook",
  "Sheet",
  "Cell",
  "Season as typed",
  "Site as typed",
  "Species as typed",
  "source_record",
];

/** Quote for CSV, and defuse spreadsheet formulas in text that starts with = + @. */
function field(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /records/export?place=…&year=… — the same filter as /records, as CSV.
 * Unrecognised filter values return 400 rather than exporting everything. Opens cleanly in Excel (UTF-8 with BOM, so macrons survive).
 */
export async function GET(request: NextRequest) {
  const wrt = getWrt();
  const lookups = await wrt.lookups();
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { filter, ignored } = parseRecordParams(raw, lookups);
  if (ignored.length) {
    // A mistyped filter must not quietly export the whole dataset.
    return new Response(
      `Not exported: these filters were not recognised: ${ignored.map((i) => `${i.param} "${i.value}"`).join(", ")}.\n`,
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
  const { rows } = await wrt.records(filter);

  const sorted = [...rows].sort(
    (a, b) =>
      a.season.order - b.season.order ||
      a.place.name.localeCompare(b.place.name) ||
      a.record.parcelName.localeCompare(b.record.parcelName) ||
      a.species.displayName.localeCompare(b.species.displayName),
  );

  const lines = [HEADERS.map(field).join(",")];
  for (const { record: r, species, place, season } of sorted) {
    const p = r.provenance;
    lines.push(
      [
        season.name,
        r.year,
        place.name,
        r.parcelName,
        species.displayIsScientific ? "" : species.displayName,
        species.scientificName,
        r.hasQuantity ? r.quantity : "",
        r.needsReview ? "Yes" : "No",
        r.notes.map((n) => `${n.kind === "ruling" ? "WRT ruling" : n.kind === "confirm" ? "To confirm" : "Mapping note"}: ${n.text}`).join(" | "),
        r.confidence,
        PRECISION_LABELS[r.precision].label,
        p.sourceFile.split("/").pop() ?? p.sourceFile,
        p.sourceSheet,
        p.sourceCell,
        p.seasonLabelOriginal,
        p.siteOriginal,
        p.speciesOriginal,
        r.id,
      ]
        .map(field)
        .join(","),
    );
  }

  const name = ["wrt-recorded-plants", filter.place, filter.species, filter.season?.toLowerCase(), filter.year]
    .filter(Boolean)
    .join("-");

  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
