import type { DataSource } from "@/lib/wrt/server";

/** Shows on every page which data the app is reading. Set by WRT_DATA_SOURCE in .env. */
export function DataSourceBadge({ source }: { source: DataSource }) {
  return source === "csv" ? (
    <span
      className="cn-badge cn-badge--behind whitespace-nowrap"
      title="Reading the CSV files in docs/planning/prototype. Set WRT_DATA_SOURCE=supabase in .env to read live data."
    >
      Data: CSV files
    </span>
  ) : (
    <span
      className="cn-badge cn-badge--ok whitespace-nowrap"
      title="Reading live data from Supabase, read-only. Set WRT_DATA_SOURCE=csv in .env to read the CSV files instead."
    >
      Data: Supabase
    </span>
  );
}
