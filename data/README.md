# Data files

The files directly in this directory are maintained inputs used by the app or its import commands:

- `species.json` is the complete species seed used by the workbook import and the standalone species seed command.
- `sites.json` supplies complete site rows to the workbook import.
- `site_areas.json` supplies complete area rows, including pins, to the workbook import.
- `seasons.json` supplies complete season rows, preserving IDs, labels, workbook totals and source cells. It includes Autumn and Spring through 2028; future seasons have null workbook totals.

- `plantings.json` nests workbook events, their planting lines and each line's review notes. Seasons use slugs; lines use stable workbook `legacy_code` values. Database identity IDs and audit fields are omitted.

- `species-reference-reviews.json` supplies reviewed identity and photo status to the species pages.

Table dumps may include audit columns; the importer excludes them so database triggers assign audit values.
New rows include all other seed fields, including descriptions, pins and deactivation state. Existing rows are skipped.

The app and import commands read species reference fields and photos from `species.json`; they do not depend on
separate profile or photo catalogues.

The workbook import reads only these JSON seeds, with no CSV dependency. It inserts parents first and uses the
returned database IDs for child rows. Reruns match workbook events by area and season, lines by `legacy_code`,
and notes by line and question. Missing rows are inserted; existing rows are skipped.
