/**
 * "How precise the records are": recorded plants by precision and by
 * confidence, each with the resolved / needs-review split kept visible.
 */
import type { Ranked } from "@/lib/wrt/queries";
import type { Confidence, Precision } from "@/lib/wrt/types";
import { CONFIDENCE_LABELS, PRECISION_LABELS } from "@/lib/wrt/review-themes";
import { formatNumber, formatShare } from "@/lib/wrt/text";
import { RankedBars, type RankedItem } from "@/components/wrt/shared/charts";

const PRECISION_ORDER: Precision[] = ["subsite", "site", "scheme", "area", "unknown"];
const CONFIDENCE_ORDER: Confidence[] = ["high", "medium", "low"];

const CONFIDENCE_MEANING: Record<Confidence, string> = {
  high: "Site and species matched cleanly",
  medium: "A site or species needed a judgement call",
  low: "An order scheme, or the source did not say where",
};

function Label({ title, note }: { title: string; note: string }) {
  return (
    <span className="cn-species">
      <span className="cn-species__common">{title}</span>
      <span className="cn-species__latin !not-italic">{note}</span>
    </span>
  );
}

function count(n: number, noun: string) {
  return `${formatNumber(n)} ${noun}${n === 1 ? "" : "s"}`;
}

export function PrecisionList({ rows }: { rows: Ranked<Precision>[] }) {
  const records = rows.reduce((a, r) => a + r.split.records, 0);
  const sorted = [...rows].sort((a, b) => PRECISION_ORDER.indexOf(a.item) - PRECISION_ORDER.indexOf(b.item));
  const items: RankedItem[] = sorted.map((r) => ({
    key: r.item,
    label: (
      <Label
        title={PRECISION_LABELS[r.item].label}
        note={`${PRECISION_LABELS[r.item].meaning} ${count(r.split.records, "record")} · ${formatShare(r.split.records, records)}`}
      />
    ),
    split: r.split,
  }));
  return <RankedBars items={items} max={Math.max(1, ...rows.map((r) => r.split.total))} />;
}

export function ConfidenceList({ rows }: { rows: Ranked<Confidence>[] }) {
  const records = rows.reduce((a, r) => a + r.split.records, 0);
  const sorted = [...rows].sort((a, b) => CONFIDENCE_ORDER.indexOf(a.item) - CONFIDENCE_ORDER.indexOf(b.item));
  const items: RankedItem[] = sorted.map((r) => ({
    key: r.item,
    label: (
      <Label
        title={CONFIDENCE_LABELS[r.item]}
        note={`${CONFIDENCE_MEANING[r.item]}. ${count(r.split.records, "record")} · ${formatShare(r.split.records, records)}`}
      />
    ),
    split: r.split,
  }));
  return <RankedBars items={items} max={Math.max(1, ...rows.map((r) => r.split.total))} />;
}
