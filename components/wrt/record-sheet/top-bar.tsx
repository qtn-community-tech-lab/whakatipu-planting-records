import Link from "next/link";
import s from "./record-sheet.module.css";

/** The dark pill at the top left: back out of the map, the chosen site, Concept tag. */
export function TopBar({ siteName, exitHref }: { siteName: string; exitHref: string }) {
  return (
    <div className={s.top}>
      <Link href={exitHref} className={s.exit} aria-label="Leave the map">←</Link>
      <span>
        <span className={s.title}>{siteName}</span>
        <span className={s.sub}>On site · New planting event</span>
      </span>
      <span className={s.concept}>Concept</span>
    </div>
  );
}
