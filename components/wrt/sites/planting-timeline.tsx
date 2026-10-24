/**
 * What went in, and when: rows (species, or parts of a site) against seasons.
 * Each dot is sized by recorded plants in that season; amber means some or
 * all of it still needs a WRT ruling. Every dot links to its records.
 */
import Link from "next/link";
import { Pin } from "@/components/wrt/shared/pin";
import type { RecordView } from "@/lib/wrt/queries";
import type { Quantity, Season, Species } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";
import { SpeciesAvatar } from "@/components/wrt/shared/species-avatar";
import { addToSplit, emptySplit } from "@/lib/wrt/queries";

interface Row {
  key: string;
  name: string;
  species?: Species;
  /** Part id when rows are parts. */
  parcelId?: string;
  areaSlug?: string;
  /** Site slug when rows are sites. */
  placeSlug?: string;
  total: Quantity;
  bySeason: Map<string, Quantity>;
}

function buildRows(records: RecordView[], rowsBy: "species" | "part" | "site"): Row[] {
  const rows = new Map<string, Row>();
  for (const v of records) {
    if (rowsBy === "part" && !v.record.parcelId) continue;
    const key = rowsBy === "species" ? v.species.slug : rowsBy === "site" ? v.place.slug : v.record.parcelId!;
    const row =
      rows.get(key) ??
      ({
        key,
        name: rowsBy === "species" ? v.species.displayName : rowsBy === "site" ? v.place.name : v.record.parcelName,
        species: rowsBy === "species" ? v.species : undefined,
        parcelId: rowsBy === "part" ? v.record.parcelId! : undefined,
        areaSlug: rowsBy === "part" ? v.place.parcels.find((p) => p.id === v.record.parcelId)?.slug : undefined,
        placeSlug: rowsBy === "site" ? v.place.slug : undefined,
        total: emptySplit(),
        bySeason: new Map(),
      } satisfies Row);
    addToSplit(row.total, v.record);
    const cell = row.bySeason.get(v.season.slug) ?? emptySplit();
    addToSplit(cell, v.record);
    row.bySeason.set(v.season.slug, cell);
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.total.total - a.total.total);
}

export function PlantingTimeline({
  records, seasons, rowsBy, hrefFor, cap = 20, rowHref,
}: {
  records: RecordView[];
  /** Every season, in order. Columns are trimmed to the first and last with records. */
  seasons: Season[];
  rowsBy: "species" | "part" | "site";
  /** Link for one dot: the records behind it. */
  hrefFor: (row: { species?: Species; parcelId?: string; areaSlug?: string; placeSlug?: string }, season: Season) => string;
  /** Link for a row name. */
  rowHref?: (row: { species?: Species; parcelId?: string; areaSlug?: string; placeSlug?: string; name: string }) => string;
  cap?: number;
}) {
  const rows = buildRows(records, rowsBy);
  if (!rows.length) return null;
  const active = new Set(records.map((v) => v.season.slug));
  const firstIdx = seasons.findIndex((s) => active.has(s.slug));
  let lastIdx = -1;
  seasons.forEach((s, i) => {
    if (active.has(s.slug)) lastIdx = i;
  });
  const cols = seasons.slice(firstIdx, lastIdx + 1);
  const max = Math.max(1, ...rows.flatMap((r) => [...r.bySeason.values()].map((c) => c.total)));

  const style = { "--cols": cols.length } as React.CSSProperties;

  const renderRow = (r: Row) => (
    <div key={r.key} className="wrt-tl__row" role="row">
      <div className="wrt-tl__name" role="rowheader">
        {r.species ? (
          <SpeciesAvatar species={r.species} />
        ) : (
          <Pin className="wrt-srow__pin" />
        )}
        {rowHref ? (
          <Link href={rowHref(r)} className={r.species?.displayIsScientific ? "wrt-tl__label italic" : "wrt-tl__label"}>
            {r.name}
          </Link>
        ) : (
          <span className={r.species?.displayIsScientific ? "wrt-tl__label italic" : "wrt-tl__label"}>{r.name}</span>
        )}
      </div>
      {cols.map((s) => {
        const c = r.bySeason.get(s.slug);
        if (!c || c.records === 0) return <div key={s.slug} className="wrt-tl__cell" role="cell" />;
        const d = Math.round(8 + 20 * Math.sqrt(c.total / max));
        const label = `${r.name}, ${s.label}: ${formatNumber(c.total)} recorded, ${c.unknown} unknown counts`;
        return (
          <div key={s.slug} className="wrt-tl__cell" role="cell">
            <Link
              href={hrefFor(r, s)}
              className="wrt-tl__dot"
              data-season="autumn"
              style={{ width: d, height: d }}
              title={label}
              aria-label={label}
            />
          </div>
        );
      })}
      <div className="wrt-tl__total" role="cell">
        <b className="tabular-nums">{formatNumber(r.total.total)}</b>

      </div>
    </div>
  );

  const shown = rows.slice(0, cap);
  const rest = rows.slice(cap);

  return (
    <div className="wrt-tl">
      <div className="wrt-tl__scroll">
        <div className="wrt-tl__grid" style={style} role="table" aria-label={`Recorded plants by ${rowsBy === "species" ? "species" : rowsBy === "site" ? "site" : "part"} and season`}>
          <div className="wrt-tl__row wrt-tl__row--years" role="row">
            <div className="wrt-tl__name" role="columnheader">{rowsBy === "species" ? "Species" : rowsBy === "site" ? "Site" : "Part of site"}</div>
            {cols.map((season) => <div key={season.slug} className="wrt-tl__year" role="columnheader">{season.label}</div>)}
            <div className="wrt-tl__total" role="columnheader">Total</div>
          </div>
          {shown.map(renderRow)}
          {rest.length > 0 && (
            <details className="wrt-tl__more">
              <summary>Show {rest.length} more</summary>
              {rest.map(renderRow)}
            </details>
          )}
        </div>
      </div>
      <p className="wrt-tl__key">
        <span>Bigger dot, more plants. Select a dot for its records.</span>
      </p>
    </div>
  );
}
