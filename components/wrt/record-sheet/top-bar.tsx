import Link from "next/link";
import s from "./record-sheet.module.css";

/** The session header over the map: a back button and one pill naming the site and what you're doing. */
export function TopBar({ siteName, exitHref }: { siteName: string; exitHref: string }) {
  return (
    <div className={s.top}>
      <Link href={exitHref} className={s.exit} aria-label="Leave the map">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
      </Link>
      <span className={s.session}>
        <b>{siteName}</b>
        <span aria-hidden="true">·</span>
        <span>New planting event</span>
      </span>
    </div>
  );
}
