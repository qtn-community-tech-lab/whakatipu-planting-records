@AGENTS.md

# Naming database queries

Every exported query in `db/queries/`, and every write added later, is named for what it does
to which entity:

- `list<Entity>s`: many rows (`listSites`, `listPlantingAreaTotals`)
- `read<Entity>`: one row, or null (`readSpecies`)
- `create<Entity>`, `update<Entity>`: add or change one row
- `deactivate<Entity>`: set `deactivated_at`; rows are never deleted

Spell the entity out even when the name gets long: `PlantingEvent`, `PlantingLine`,
`PlantingArea`, not `Planting`, `Line` or `Area`. The one exception is `findPlantingLines`,
which pages through lines that match a filter.

The base queries in `db/queries/views.ts` (`siteTotals`, `lines`, ...) are building blocks named
after the view or table they read. Pages never call them; they call the named queries built on them.
