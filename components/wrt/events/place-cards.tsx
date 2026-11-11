"use client";
/**
 * A card per place planted, each with its species and a subtotal, and the events' total when there
 * are several. The form's check step uses it, with Change on each card.
 */
import { MapPin } from "lucide-react";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { FigureList, type FigureRow } from "@/components/wrt/shared/figure-list";
import { ListRow } from "@/components/wrt/shared/list-row";
import { formatNumber } from "@/lib/wrt/text";
import type { AreaPick, DrawnArea } from "./map-event-form";
import s from "./map-event-form.module.css";

/** One place planted: a drawn area (its outline), or the site as a whole (its pin). Each is, in effect, a planting event. */
export interface PlaceCard {
  key: string; title: string; sub?: string | undefined; pts?: DrawnArea["pts"] | undefined; pick?: AreaPick | undefined; rows: FigureRow[]; total: number;
}
export const plantsLabel = (n: number) => `${formatNumber(n)} ${n === 1 ? "plant" : "plants"}`;
export const cardLead = (c: PlaceCard) => (c.pts ? <AreaShape pts={c.pts} size={44} onMap /> : <span className={s.pinTile}><MapPin size={20} strokeWidth={2.2} /></span>);

export function PlaceCards({ cards, action }: {
  cards: PlaceCard[];
  /** A button at the end of each card's head, e.g. Change. Leave out for none. */
  action?: { label: string; describe: (c: PlaceCard) => string; onClick: (c: PlaceCard) => void } | undefined;
}) {
  const many = cards.length > 1;
  return (
    <div className={s.cards}>
      {cards.map((c) => (
        <div key={c.key} className={s.placeCard}>
          <FigureList
            title={c.title} rows={c.rows} total={{ label: many ? "Subtotal" : "Total", figure: plantsLabel(c.total) }}
            head={
              <ListRow
                lead={cardLead(c)} title={c.title} subtitle={c.sub}
                end={action && <button type="button" className={s.link} onClick={() => action.onClick(c)} aria-label={action.describe(c)}>{action.label}</button>}
              />
            }
          />
        </div>
      ))}
      {many && <ListRow className={s.grand} title={`${cards.length} planting events`} figure={plantsLabel(cards.reduce((t, c) => t + c.total, 0))} />}
    </div>
  );
}
