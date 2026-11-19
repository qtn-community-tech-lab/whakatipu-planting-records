# Data files

The files directly in this directory are maintained inputs used by the app or its import commands:

- `species.json` is the complete species seed used by the workbook import and the standalone species seed command.
- `site-locations.json` supplies researched pins to `scripts/import-pins.ts`.
- `species-reference-reviews.json` supplies reviewed identity and photo status to the species pages.

The app and import commands read species reference fields and photos from `species.json`; they do not depend on
separate profile or photo catalogues.
