/**
 * Tailwind classes the panel's screens share (the site list, a site's page, a past season, the form):
 * the frame that scrolls with a footer of buttons, cards, rows and links. One-off styles are inline where
 * they're used; panel.module.css keeps the few things Tailwind can't do neatly.
 */

/** A panel screen: a column that fills the panel. */
export const form = "flex min-h-0 flex-1 flex-col";

/** A screen's heading block. Phones: smaller, and hidden (but read out) when it repeats the top bar; slimmer still while typing. */
export const head =
  "panel-head flex shrink-0 flex-col gap-[14px] border-b border-[var(--border-card)] pt-1 pb-[14px] max-md:gap-1.5 max-md:pt-3 max-md:pb-2.5 max-md:data-[repeat]:absolute max-md:data-[repeat]:size-px max-md:data-[repeat]:overflow-hidden max-md:data-[repeat]:[clip-path:inset(50%)] [html[data-keyboard]_&]:gap-0 [html[data-keyboard]_&]:pt-0.5 [html[data-keyboard]_&]:pb-2";

/** A screen's title. Focus moves here when a screen opens, for screen readers; it isn't a control, so no ring. */
export const title =
  "m-0 font-sans text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-[var(--text-strong)] focus:outline-none max-md:text-[19px] [html[data-keyboard]_&]:text-[17px]";

/** The part of a screen that scrolls. It is the container the plant rows measure themselves against. */
export const scroll =
  "@container flex min-h-0 flex-1 flex-col gap-[22px] overflow-x-hidden overflow-y-auto overscroll-contain py-[18px] pr-[calc(var(--panel-pad,0px)+2px)] pl-[var(--panel-pad,0px)] mx-[calc(-1*var(--panel-pad,0px))] [html[data-keyboard]_&]:pt-2.5 [html[data-keyboard]_&]:pb-2";

/** A block of related fields. */
export const group = "flex flex-col gap-3";

/** A list of plant rows. */
export const rows = "m-0 flex list-none flex-col border-t border-[var(--border-card)] p-0";

/** A row's problem, under its quantity. */
export const rowError = "block pt-1 text-right font-sans text-[12px] leading-[1.3] font-semibold text-[var(--text-risk)]";

/** A screen's footer of buttons. Phones: it slides away while the plant list scrolls down, and goes while typing. */
export const foot =
  "flex shrink-0 items-center gap-2.5 border-t border-[var(--border-card)] pt-[14px] pb-1.5 max-md:[transition:transform_220ms_var(--ease),margin-bottom_220ms_var(--ease),opacity_160ms_ease] max-md:motion-reduce:transition-none max-md:data-[away]:pointer-events-none max-md:data-[away]:mb-[calc(-1*var(--bar-height,72px))] max-md:data-[away]:opacity-0 max-md:data-[away]:[transform:translateY(100%)] [html[data-keyboard]_&]:hidden";

/** The footer's quiet button. */
export const back =
  "min-h-[52px] cursor-pointer rounded-[var(--radius-pill)] border-0 bg-[var(--surface-soft)] px-5 py-0 font-sans text-[15px] leading-[normal] font-bold text-[var(--text-brand)]";

/** The footer's main button. It dips when pressed. */
export const next =
  "inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-pill)] border-0 bg-[var(--cn-green-800)] px-[22px] py-0 font-sans text-[15.5px] leading-[normal] font-bold text-[var(--cn-white)] [transition:transform_420ms_cubic-bezier(.34,1.4,.5,1)] active:[transform:scale(0.97)] active:duration-[90ms] disabled:cursor-progress disabled:opacity-75";

/** One quiet line under a title. */
export const context = "m-0 font-sans text-[13.5px] leading-[1.4] font-medium text-[var(--text-muted)] [.panel-head>&]:-mt-2";

/** What a list says when it has nothing. */
export const empty = "m-0 px-0 py-3 font-sans text-[14px] leading-[normal] font-normal text-[var(--text-muted)]";
