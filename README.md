# Planting events: record new plantings with a drawn area (prototype)

## Summary

A planting event records:
- **the site**, and optionally **which part of the site**
- **the planted area**, drawn as a polygon on a satellite map
- **the planting date**, **season** and **season year**
- **each species planted**, with how many of each
- optional **notes**

Saved events can be listed, edited, deleted and **exported to CSV**, with each area included as GeoJSON.

This is a **prototype**:
- There is no sign-in yet.
- Events are saved to a local JSON file until the Supabase integration (another PR) is merged.
- Events are **not** added to the historical totals.

Size: 32 files, about 2,000 lines added, 4 commits. Each commit is one layer that builds on the one before, so reviewing commit by commit is easiest.

| Commit | What it adds |
|---|---|
| `d93f183` Data model, validation and storage seam | Event types, season rule, area calculation, the shared validator, the `EventStore` interface and the temporary JSON store, with tests |
| `406a95a` Map for drawing the planted area | The terra-draw dependency and the map component |
| `8528a18` Form, pages and nav | List, new and edit pages, Server Actions, species picker, nav item, styles |
| `2104851` CSV export with GeoJSON areas | `/events/export`, with tests |

## Screenshots

<img width="1143" height="746" alt="image" src="https://github.com/user-attachments/assets/7bf27f92-e00d-484a-bb1e-0a95a11a9f6a" />
<img width="2618" height="1706" alt="image" src="https://github.com/user-attachments/assets/6ffd7773-9885-4cf3-8028-d276c8ff5e96" />
<img width="1170" height="3102" alt="image" src="https://github.com/user-attachments/assets/a640d3f2-5fe8-4f96-8a1a-c6c78e80e094" />


Mobile still needs some work done though...

## How it works

```text
/events/new, /events/[id]/edit      form (client) with the drawing map
   ↓ Server Actions                 app/events/actions.ts: re-validate, then save
lib/wrt/events/validate.ts          one validator, used by both the form and the server
   ↓
lib/wrt/events/server.ts            getEventStore(): the only place a store is created
   ↓
EventStore interface                lib/wrt/events/event-store.ts
   └─ JsonEventStore (for now)      data/local/planting-events.json (gitignored)
   └─ SupabaseEventStore (next)     once the Supabase PR is merged
```

This follows the pattern the app already uses for historical data. There, `WrtRepository` is the interface, `getWrt()` is the single entry point, and pages never know whether the data comes from CSV. Planting events work the same way, so moving to a database only means changing **one line** in `lib/wrt/events/server.ts`.

## Decisions and the reasoning behind them

We settled these through a round of questions before writing any code. They're recorded here so reviewers can see why things are built this way.

### Storage: a local JSON file behind an interface
- **Why not wait for the database?** Supabase Postgres is being added in a separate PR. Building the form against an interface lets this work go ahead in parallel instead of being blocked.
- **Why JSON and not localStorage?** Saving on the server means the real save path is exercised: Server Actions, validation on the server, and redirects. A browser-only store would hide all of that and need rewriting later.
- **Safeguards:** files are written atomically (to a temporary file, then renamed), and writes run one at a time so two quick saves can't overwrite each other. The code is heavily commented with what it does, why, and what the Supabase replacement must keep the same.
- ⚠️ **This will not work on Vercel.** Vercel's filesystem is read-only and temporary, so the JSON store is for local development only. If it does run on Vercel, it logs a warning.
- `tests/event-store-contract.ts` is a **reusable test suite** for the storage contract. The Supabase store should pass the same tests.

### Exactly one polygon per event, overlaps allowed
- Each planting event is one planted area. Several events at a site can overlap; for example, infill planting covers ground that was planted before.
- While you draw, the site's other events show as **faint dashed outlines** labelled with their season, so you can see what's already recorded there.
- The area is validated on both the client and the server. It must be closed and have at least three corners, it can't cross itself, and coordinates must be within range.

### Drawing library: terra-draw
- **It handles touch.** We expect phones and desktops to be used about equally, so tapping to draw on a phone is essential.
- **It's actively maintained and works with the map library the app already uses.** Its MapLibre adapter supports `maplibre-gl` version 4 and later; this app uses 6.13.
- **The alternative needed more work.** `@mapbox/mapbox-gl-draw` would need a compatibility layer to run on MapLibre, and its touch support is weaker.
- **How it's used:**
  - Tap the corners of the area, then tap the first corner again to close it.
  - After that, drag corners to adjust, or tap the midpoint of an edge to add a corner.
  - "Redraw area" clears the shape and starts again.

### Satellite map by default
- Planted areas are much easier to trace on aerial imagery than on a street map.
- The imagery is Esri World Imagery, which is free to use with attribution. A toggle switches back to the app's usual Carto street map.
- The imagery sits under the map's labels, so place names stay readable.
- LINZ aerial imagery (New Zealand-sourced, needs a free API key) is a possible alternative later; see the open questions.

### Season suggested from the date, and the user can change it
- The form suggests a season from the planting date, using southern-hemisphere seasons:

  | Months | Season |
  |---|---|
  | Dec–Feb | Summer |
  | Mar–May | Autumn |
  | Jun–Aug | Winter |
  | Sep–Nov | Spring |

- December counts toward the **following** year's Summer (December 2026 → Summer 2027), so one summer has one label.
- The user can always change both the season and the year. A late-May planting might still count as "Autumn" to WRT. Once the user picks a season themselves, changing the date no longer overwrites it.

### Four seasons, and events kept out of the historical totals
- **The conflict:** the historical data has only two seasons a year (Autumn and Spring), but new plantings can happen in Summer or Winter.
- **The decision:** rather than guess how WRT wants those reported, new events are stored separately and **not added to any historical total** for now. Nothing on the existing pages changes.
- How Summer and Winter roll into the historical reporting is a decision for WRT; see the open questions.

### Choosing a site and species
- **Site, then an optional part of the site.** The lists are the same ones the explorer uses. Order schemes such as Paper4Trees are excluded, because they aren't physical places.
- **Species come only from the 95 already registered.** The picker uses the same matching as the app's search, so "kowhia" finds Kōwhai and macrons are optional.
- **Each species line needs a whole-number quantity above 0**, and the same species can't be added twice.
- The app's existing rule still holds: internal IDs are used only behind the scenes and are never shown as labels.

### Validation in one place
- `validateEventInput` is used by both the form (to show errors next to each field) and the Server Actions (as the real check).
- **Why the server checks again:** Server Actions can be called directly with a POST request, so nothing sent from the browser is trusted. The server re-checks everything, including that the site exists, the part belongs to that site, the species are registered, and the date isn't in the future.
- **How errors behave in the form:**
  - After the first attempt to save, errors update as the user fixes them.
  - The cursor jumps to the first problem.
  - Error messages are linked to their fields for screen readers.

### Photos: visible but disabled
- The photo field is shown, with the label "available once photo storage is connected". It stays disabled until Supabase Storage is available.
- `photoUrl` is already part of the event and is already a column in the CSV export (empty for now). That way neither the data nor the export needs to change when uploads are turned on.

### CSV export: one row per event and species, with GeoJSON
- The export writes **one row for each species in each event**, so the file sums and pivots cleanly in a spreadsheet.
- The event's own details (date, site, area and so on) repeat on each of its rows. An "Event total plants" column lets you count each event once.
- `polygon_geojson` holds the area as a GeoJSON Polygon (standard longitude/latitude). You can paste a cell into geojson.io to see it, or load the column into GIS software.
- The file follows the same rules as the existing records export:
  - it opens in Excel with macrons intact
  - it uses Windows line endings
  - text that starts like a formula is neutralised
- Showing polygons on site pages comes later. For now the CSV is the output.

### Edit and delete
- Editing reuses the same form, and the map opens on the saved area.
- Deleting asks for confirmation. There is no undo or history yet.

## Dependencies

### New npm packages
| Package | Version | Why |
|---|---|---|
| `terra-draw` | ^1.39.0 | Drawing and editing polygons, with touch and mouse support |
| `terra-draw-maplibre-gl-adapter` | ^1.5.0 | Connects terra-draw to the app's existing `maplibre-gl` 6 map |

No other packages were added or upgraded.

### External services (no keys needed)
| Service | Used for |
|---|---|
| Esri World Imagery tiles | Satellite basemap (attribution shown on the map) |
| Carto basemaps | Street map and label fonts (already used by the Sites map) |

### Environment variables
| Variable | Required | Purpose |
|---|---|---|
| `WRT_EVENTS_FILE` | No | Saves events to a different file. The default is `data/local/planting-events.json`. Useful for testing. |

### Other changes
- `.gitignore`: adds `/data/local/`, so events saved locally are never committed.
- Navigation: adds a **New planting event** item, with its own icon, to the sidebar and mobile menu.
- `styles/events.css`: uses only Canopy design tokens. It stacks into a single column on narrow screens and gives buttons a 44 px touch target.

### Existing audit warnings (not caused by this PR)
`npm audit` reports advisories in `next`, `zod`, `undici`, `vite` and `minimatch`. They were already there before this PR; the two new packages don't add any. They're worth a separate PR.

## Testing

### Automated
- `npx tsc --noEmit`: no type errors.
- ESLint passes on all new and changed files.
- `npm test`: **251 tests pass across 21 files. 50 of them are new:**

| Test file | Covers |
|---|---|
| `events-season.test.ts` | Season at every month boundary, impossible dates, today in NZ time |
| `events-validate.test.ts` | 17 kinds of bad input are rejected, order schemes are rejected, and area and self-crossing checks work |
| `events-store.test.ts` + `event-store-contract.ts` | Create, read, update and delete; ordering; 10 saves at once; returned data can't change what's stored; the file format |
| `events-csv.test.ts` | One row per species, macrons kept, the GeoJSON reads back correctly, formula-like text neutralised |

### Manual (in a browser)
- [x] Create an event at Lake Hayes with a part of the site and a drawn area. It saved correctly.
- [x] A second, overlapping event at the same site; the first shows as a dashed outline
- [ ] Saving an empty form shows errors next to each field
- [ ] Edit an event: the map opens on its area, a corner can be dragged, and the change saves
- [ ] Delete an event, with confirmation
- [ ] Export the CSV, open it in Excel or Numbers, and paste a `polygon_geojson` cell into geojson.io
- [ ] Repeat on a phone-sized screen and on a real phone
- [ ] The historical pages and their totals are unchanged

**A bug found and fixed during testing:** after saving, the page crashed with `Cannot read properties of undefined (reading 'setData')`. When the page moved to the list, the map was removed before the drawing tool cleaned up, so the drawing tool tried to clear map layers that no longer existed. The drawing tool now only cleans up while the map still exists. The check relies on MapLibre's `remove()` deleting the map's style, which we confirmed in MapLibre's source.

### Running it locally
```bash
npm install
npm run dev            # then open /events/new
# optional: keep test events out of data/local/
WRT_EVENTS_FILE=/tmp/events.json npm run dev
```

## Not included (later)
- **Supabase storage** for events, plus photo upload through Supabase Storage. This waits on the Supabase PR. The plan is to:
  - add `SupabaseEventStore`, storing the area as a PostGIS `geometry(Polygon, 4326)` column and species lines in a separate table
  - change the one line in `server.ts`
  - run the storage contract tests against it
  - import any events saved in the local JSON file
- **Staff sign-in.** `app/events/actions.ts` marks where the check goes.
- **Showing the areas on site pages**, with details when you click one, and survivability tracking.
- **Merging events into the historical totals.** This needs WRT's decision on Summer and Winter.
- **Tracing the boundary with GPS while walking it.** For now the map only has a "locate me" button.
- **Recording events offline.**

## Open questions for WRT and reviewers
1. **The season rule:** is it right that December counts toward the next year's Summer?
2. **Reporting:** how should Summer and Winter plantings appear alongside the Autumn and Spring history?
3. **CSV layout:** one row per species (current) or one row per event?
4. **Imagery:** keep Esri, or switch to LINZ aerials (New Zealand-sourced, needs a free API key)?

🤖 Generated with [Claude Code](https://claude.com/claude-code)
