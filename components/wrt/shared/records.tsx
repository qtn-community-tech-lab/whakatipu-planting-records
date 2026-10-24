/**
 * Record-level views: the table of species × site × season rows, provenance,
 * and saved event notes. Records with provenance can show
 * the exact spreadsheet cell it came from.
 */
import { Fragment } from "react";
import { SpeciesAvatar } from "./species-avatar";
import Link from "next/link";
import type { PlantingRecord } from "@/lib/wrt/types";
import type { RecordView } from "@/lib/wrt/queries";
import { formatNumber } from "@/lib/wrt/text";
import { SpeciesName, hrefs } from "./names";

/** Expandable audit trail back to the source cell. */
export function Provenance({ record }: { record: PlantingRecord }) {
  const p = record.provenance;
  if (!Object.keys(p).length && !record.notes) return null;
  const fileName = p.sourceFile?.split("/").pop() ?? p.sourceFile;
  return (
    <details className="wrt-prov">
      <summary>Source</summary>
      <dl>
        <dt>Cell</dt>
        <dd><code>{p.sourceSheet}!{p.sourceCell}</code></dd>
        <dt>Workbook</dt>
        <dd title={p.sourceFile}>{fileName}</dd>
        <dt>Season as typed</dt>
        <dd>{p.seasonLabelOriginal}</dd>
        <dt>Site as typed</dt>
        <dd>{p.siteOriginal}</dd>
        <dt>Species as typed</dt>
        <dd>{p.speciesOriginal}</dd>
        {record.quantity === null && <><dt>Quantity</dt><dd>Unknown</dd></>}
        {record.notes && <><dt>Event notes</dt><dd>{record.notes}</dd></>}

      </dl>
    </details>
  );
}

/**
 * Table of records. Hide columns that the page already fixes
 * (e.g. hide "site" on a site page).
 */
export function RecordsTable({
  rows, hide = [], caption,
}: {
  rows: RecordView[];
  hide?: ("season" | "site" | "species")[];
  caption?: string;
}) {
  const show = (c: "season" | "site" | "species") => !hide.includes(c);
  return (
    <div className="wrt-table-wrap">
      <table className="wrt-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {show("season") && <th>Season</th>}
            {show("site") && <th>Site</th>}
            {show("species") && <th>Species</th>}
            <th className="cn-num">Recorded plants</th>
            <th>Date</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ record, species, place, season }) => (
            <Fragment key={record.id}>
            <tr>
              {show("season") && (
                <td className="whitespace-nowrap"><Link href={hrefs.season(season.slug)}>{season.label}</Link></td>
              )}
              {show("site") && (
                <td>
                  <span className="cn-species">
                    <Link href={hrefs.place(place.slug)} className="cn-species__common">{place.name}</Link>
                    {record.parcelName !== place.name && <span className="cn-species__latin is-plain">{record.parcelName}</span>}
                  </span>
                </td>
              )}
              {show("species") && <td><span className="wrt-tcell-sp"><SpeciesAvatar species={species} /><SpeciesName species={species} link /></span></td>}
              <td className="cn-num font-extrabold">{record.quantity !== null ? formatNumber(record.quantity) : <span className="cn-num--empty">Unknown</span>}</td>
              <td>{record.plantingDate ?? "Unknown"}</td>
              <td><Provenance record={record} /></td>
            </tr>

            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
