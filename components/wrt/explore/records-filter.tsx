import Link from "next/link";
import type { Lookups, PlaceSummary } from "@/lib/wrt/queries";
import { type RecordsView, hasFilters } from "./filters";
import { AutoSubmit } from "./auto-submit";

/** Radio group styled as a Canopy segmented control. Works without JS. */
function Segmented({
  name, label, options, value,
}: { name: string; label: string; options: { value: string; label: string }[]; value: string }) {
  const id = `exp-${name}`;
  return (
    <div className="cn-field">
      <span className="cn-field__label" id={id}>{label}</span>
      <div className="cn-seg exp-seg" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <label key={o.value} className="cn-seg__opt">
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === value} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Filter bar for /records. A plain GET form: every control is a named field,
 * so the result is a linkable URL and works without JavaScript.
 */
export function RecordsFilter({
  view, lookups, places,
}: { view: RecordsView; lookups: Lookups; places: PlaceSummary[] }) {
  const f = view.filter;
  const sites = places.map((p) => p.item).sort((a, b) => a.name.localeCompare(b.name));

  const selectedPlace = sites.find((p) => p.slug === f.place);

  // Two species can share a display name (contested pairs): add the botanical name to tell them apart.
  const nameCount = new Map<string, number>();
  for (const s of lookups.species) nameCount.set(s.displayName, (nameCount.get(s.displayName) ?? 0) + 1);

  return (
    <form method="get" action="/records" className="exp-form" aria-label="Filter records">
      <div className="exp-form__selects">
        <div className="cn-field">
          <label className="cn-field__label" htmlFor="exp-place">Site</label>
          <select id="exp-place" name="place" className="wrt-select" defaultValue={f.place ?? ""}>
            <option value="">All sites</option>
            {sites.map((p) => (
              <option key={p.slug} value={p.slug}>{p.isScheme ? `${p.name} (order scheme)` : p.name}</option>
            ))}
          </select>
        </div>
        <div className="cn-field">
          <label className="cn-field__label" htmlFor="exp-parcel">Part of site</label>
          <select id="exp-parcel" name="parcel" className="wrt-select" defaultValue={f.parcel ?? ""} disabled={!selectedPlace}>
            <option value="">{selectedPlace ? "All parts of this site" : "Choose a site first"}</option>
            {selectedPlace?.parcels.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
          </select>
        </div>
        <div className="cn-field">
          <label className="cn-field__label" htmlFor="exp-species">Species</label>
          <select id="exp-species" name="species" className="wrt-select" defaultValue={f.species ?? ""}>
            <option value="">All species</option>
            {lookups.species.map((s) => (
              <option key={s.slug} value={s.slug}>
                {(nameCount.get(s.displayName) ?? 0) > 1 && !s.displayIsScientific ? `${s.displayName} (${s.scientificName})` : s.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="cn-field">
          <label className="cn-field__label" htmlFor="exp-year">Year</label>
          <select id="exp-year" name="year" className="wrt-select" defaultValue={f.year ? String(f.year) : ""}>
            <option value="">All years</option>
            {[...lookups.years].sort((a, b) => b - a).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

      </div>

      <div className="exp-form__row">
        <div className="cn-field exp-form__grow">
          <label className="cn-field__label" htmlFor="exp-q">Search by name</label>
          <input
            id="exp-q" name="q" type="search" className="cn-search" defaultValue={f.q ?? ""}
            placeholder="Species, site or part of a site" autoComplete="off"
          />
        </div>
        <Segmented
          name="seasonKey" label="Planting season" value={f.season === undefined ? "" : `label-${f.season}`}
          options={[{ value: "", label: "All" }, ...lookups.seasons.map((s) => ({ value: `label-${s.name}`, label: s.label }))]}
        />

        {view.sort !== "season" && <input type="hidden" name="sort" value={view.sort} />}
        <div className="exp-form__actions">
          <button type="submit" className="cn-btn cn-btn--primary cn-btn--md">Apply</button>
          {hasFilters(f) && (
            <Link href="/records" className="cn-btn cn-btn--soft cn-btn--md !no-underline">Clear</Link>
          )}
        </div>
      </div>
      <AutoSubmit />
    </form>
  );
}
