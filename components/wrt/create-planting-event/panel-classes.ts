/**
 * Tailwind classes the panel's screens share (the site list, a site's page, a past season, the form):
 * the frame that scrolls with a footer of buttons, cards, rows and links. One-off styles are inline where
 * they're used; panel.module.css keeps the few things Tailwind can't do neatly.
 */

/** A panel screen: a column that fills the panel. */
export const form = "flex min-h-0 flex-1 flex-col";

/** The part of a screen that scrolls. It is the container the plant rows measure themselves against. */
export const scroll =
  "@container flex min-h-0 flex-1 flex-col gap-[22px] overflow-x-hidden overflow-y-auto overscroll-contain py-[18px] pr-[calc(var(--panel-pad,0px)+2px)] pl-[var(--panel-pad,0px)] mx-[calc(-1*var(--panel-pad,0px))] [html[data-keyboard]_&]:pt-2.5 [html[data-keyboard]_&]:pb-2";

/** One quiet line under a title. */
export const context = "m-0 font-sans text-[13.5px] leading-[1.4] font-medium text-[var(--text-muted)] [.panel-head>&]:-mt-2";

/** What a list says when it has nothing. */
export const empty = "m-0 px-0 py-3 font-sans text-[14px] leading-[normal] font-normal text-[var(--text-muted)]";
