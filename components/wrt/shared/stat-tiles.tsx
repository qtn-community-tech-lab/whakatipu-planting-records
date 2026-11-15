/**
 * A few figures at a glance, side by side, each a label over a big number: e.g. a season's
 * plants, species and sites.
 */
export function StatTiles({ stats }: { stats: readonly { label: string; value: string }[] }) {
  return (
    <dl className="m-0 grid gap-2" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map((x) => (
        <div key={x.label} className="rounded-[var(--radius-field)] bg-[#eef4e4] px-3 py-2.5">
          <dt className="font-sans text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--text-eyebrow)]">{x.label}</dt>
          <dd className="m-0 mt-0.5 font-sans text-xl font-extrabold leading-tight tabular-nums text-[var(--cn-green-900)]">{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}
