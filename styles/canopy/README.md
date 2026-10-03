# Canopy design system

Canopy is the visual language for the **Whakatipu Reforestation Trust (WRT)** nursery and planting system: plan future demand → grow plants in the nursery → allocate and plant → report. Users are a nursery coordinator, volunteers on Wednesday sessions and planting-day leads — mostly desktop, some tablet.

**Source:** extracted from the "Wakatipu Reforestation prototype" project — `Canopy Sidebar.dc.html`, `Canopy Topbar.dc.html`, `Canopy v3 Plan / Grow / Plant.dc.html`. Every value here is copied from those files, not rounded.

## Quick start
```html
<link rel="stylesheet" href="canopy-ds/styles.css">
<body class="cn-app"> … <button class="cn-btn cn-btn--primary">Record activity</button>
```
- **Any stack:** link `styles.css` and use the `cn-*` classes (see `components/components.css`).
- **React:** import from `components/<group>/<Name>.jsx`; props are in the sibling `.d.ts`.
- **Tailwind / Figma / Style Dictionary:** `tokens.json` has every token as flat key/values.
- Use **semantic aliases** (`--surface-card`, `--text-muted`, `--action-primary`) in product code; base values (`--cn-green-800`) only when defining new aliases.

## Index
- `styles.css` — entry point (imports only)
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css` (spacing, radii, layout, control heights), `effects.css` (shadows, borders, bars, motion)
- `tokens.json` — same tokens as JSON
- `components/components.css` — framework-agnostic classes
- `components/core` — Button, CloseButton, Badge, Tag, Delta
- `components/navigation` — Sidebar, Topbar, ChipGroup
- `components/forms` — Segmented, Field, TextInput, Popover
- `components/data` — Card, StatTile, StageTile, ProgressBar, SpeciesName, DataTable, ListRow, PhotoSlot
- `components/feedback` — Callout, Banner, Stepper, Sheet, Modal, ConfirmDialog
- `guidelines/` — specimen cards (colour, type, radii, elevation, spacing, layout)
- `ui_kits/app-shell/index.html` — sidebar + topbar + Overview starting point
- `SKILL.md` — Agent Skill wrapper for Claude Code

## Content fundamentals
- **Plain, operational NZ English.** "Pricked out", "potted up", "planting-ready", "bought in". Sentence case everywhere — headings, buttons, badges, table heads.
- **Te reo Māori with macrons, always:** Mānuka, Kānuka, Kōwhai, tī kōuka, Whakatipu. Search ignores macrons; display never drops them.
- **Common name first, botanical name in italics beneath** (Mānuka / *Leptospermum scoparium*).
- **Headlines state the number:** "12,410 native plants growing across 94 species", "7,020 plants targeted this season". Questions are allowed for planning screens: "What are we growing for, and will we have enough?"
- **Buttons are verbs + object:** "Record activity", "Record 24 plants", "Mark event complete", "Print blank session sheet".
- **Explain the rule in one muted line** under a card: "Losses reduce stock, not the target." "Entries can be corrected with a new movement. The original stays in history."
- **Badges say the consequence, not a code:** "132 short", "Too late to grow, buy in", "41% · behind".
- Separators: middle dot ` · ` between facts, `→` for flows (V150 → PB3, 282 → 366), true minus `−`, en-GB numbers (7,020), dates like "Wed 7 Oct 2026".
- Container codes (V150, T28, PB3) and IDs (WH-07, ARW-03) are used verbatim. "You/we" is implicit; copy rarely addresses the user directly.
- **No emoji.** The only glyphs are ✓, ×, → and ←.

## Visual foundations
- **Colour:** warm stone app background (#f3f1ea), white cards, one deep green (#1f4d34) doing all the heavy lifting — primary buttons, active nav, H1s, hero cards. Sage tints (#f2f5f0, #e7eee5) for soft fills and info. **Lime #d6ea8c is reserved for Stage 4 / ready-to-plant and only appears on dark green.** Status uses soft bg + dark fg pairs (amber behind, terracotta risk, indigo in production); "too late" is the only solid red.
- **Type:** Plus Jakarta Sans only (+ system mono for codes and presentation captions). Heavy 800 for headlines and figures with negative tracking (−.03em); 700 for titles and buttons; 600 for cells and labels; 500 for meta. Line-height 1 for UI, 1.35–1.45 for prose.
- **Backgrounds:** flat colour. No gradients, no textures, no patterns, no illustrations, no leaf icons. Imagery = real site and plant photography in rounded slots.
- **Cards:** white, 1px #e7e4dc border, 22px radius, **no shadow**. Inner tiles are sage with 16px radius. Hero cards are solid green with white text.
- **Elevation:** only floating things get shadows — popover, modal, side sheet — all green-tinted (rgba(21,38,28,…)). Scrim is rgba(21,38,28,.22), no blur.
- **Radii:** everything interactive is a full pill (buttons, nav, chips, badges, search, bars). Containers step up with size: 12 row → 14 field → 16 tile → 20 stat → 22 card → 26 sheet → 30 dialog.
- **Borders:** hairlines #efece5 between rows; no zebra striping. Inputs 1.5px sage, active 2px green. Selected table row = sage fill + 2px inset green ring.
- **Layout:** 1440 frame, 248px sidebar, 68px topbar, main padding 32/40/40, 16px grid gaps, 20px vertical rhythm. Detail opens in a 440px right sheet inset 16px; on tablet Record activity rises as a bottom panel.
- **Hover/press:** nav hover = sage fill. *Recommended additions (not in source):* primary hover → #15261c, secondary/soft hover → sage tint, 2px green focus ring offset 2px.
- **Motion:** none defined in source. Suggested: 120–320ms, ease `cubic-bezier(.2,.7,.2,1)`, sheets slide in from the right, bottom panel slides up. No bounce.
- **Transparency:** only white-alpha fills inside green hero cards (.1/.12/.18).

## Iconography
Canopy is **icon-free by design** — navigation, buttons and badges are text only. The only glyphs are Unicode: ✓ (done), × (close), → (link/flow), ← (back). No icon font, no SVG set, no emoji. If a future screen genuinely needs icons, use Lucide at 1.75 stroke and flag it.

## Logo
No WRT logo was provided. The sidebar renders the organisation name in type ("Whakatipu Reforestation Trust", 17/800, green). Add the real mark to `assets/` when available.

## Intentional additions
- **Delta**, **Tag**, **StageTile**, **PhotoSlot** — named wrappers for patterns repeated across the source screens.
- Hover/focus states on buttons and chips — the source only defines nav hover.
