/**
 * Two small "how is this made up" lists for the home page: plants by site
 * class and by saved record precision.
 */
import type { Ranked } from "@/lib/wrt/queries";
import type { Precision, SiteClass } from "@/lib/wrt/types";
import { PRECISION_LABELS, SITE_CLASS_LABELS } from "@/lib/wrt/labels";
import { formatNumber, formatShare } from "@/lib/wrt/text";
import { RankedBars, type RankedItem } from "@/components/wrt/shared/charts";

const CLASS_NOTE: Record<SiteClass, string> = {
  keystone: "Large restoration sites",
  community: "Parks and community land",
  school: "School grounds",
  unknown: "Site class not recorded",
};

function Label({ title, note }: { title: string; note: string }) {
  return (
    <span className="cn-species">
      <span className="cn-species__common">{title}</span>
      <span className="cn-species__latin is-plain">{note}</span>
    </span>
  );
}

/** Keystone / Community / School / Not a site. */
export function ClassBreakdown({ rows }: { rows: Ranked<SiteClass>[] }) {
  const total = rows.reduce((a, r) => a + r.split.total, 0);
  const items: RankedItem[] = rows.map((r) => ({
    key: r.item,
    label: <Label title={SITE_CLASS_LABELS[r.item]} note={`${CLASS_NOTE[r.item]} · ${formatShare(r.split.total, total)}`} />,
    split: r.split,
  }));
  return <RankedBars items={items} aligned />;
}

const PRECISION_NOTE: Record<Precision, string> = {
  site: "Whole site only",
  subsite: "Part of a site",
  area: "An area inside a parcel",
  scheme: "An order scheme",
  unknown: "Source did not say where",
};

/** How precisely the source says where the plants went. */
export function PrecisionBreakdown({ rows }: { rows: Ranked<Precision>[] }) {
  const items: RankedItem[] = rows.map((r) => ({
    key: r.item,
    label: (
      <Label
        title={PRECISION_LABELS[r.item].label}
        note={`${PRECISION_NOTE[r.item]} · ${formatNumber(r.split.records)} records`}
      />
    ),
    split: r.split,
  }));
  return <RankedBars items={items} aligned />;
}
