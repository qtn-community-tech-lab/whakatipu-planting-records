# Data files

The files directly in this directory are maintained inputs used by the app or its import commands:

- `species.json` is the complete species seed used by the workbook import and the standalone species seed command.
- `sites.json` supplies complete site rows to the workbook import.
- `site_areas.json` supplies complete area rows, including pins, to the workbook import.
- `seasons.json` supplies complete season rows, preserving IDs, labels, workbook totals and source cells. It includes Autumn and Spring through 2028; future seasons have null workbook totals.

- `species-reference-reviews.json` supplies reviewed identity and photo status to the species pages.

Site and area dumps may include audit columns; the importer excludes them so database triggers assign audit values.
Rerunning the import applies all other seed fields, including descriptions, pins and deactivation state.

The app and import commands read species reference fields and photos from `species.json`; they do not depend on
separate profile or photo catalogues.
