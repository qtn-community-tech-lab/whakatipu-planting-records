# Canopy design system

Canopy supplies the app's colour, typography, spacing, radii and base component styles. The CSS is vendored from the WRT prototype; keep app-specific changes outside this directory.

## Files and use

`app/globals.css` imports `colors.css`, `typography.css`, `spacing.css`, `effects.css` and `components.css`, followed by app styles. `app/layout.tsx` applies `cn-app` to the body. `tokens.json` mirrors the tokens for external tooling; application code does not read it.

Use semantic aliases such as `--surface-card`, `--text-muted` and `--action-primary`. Base values such as `--cn-green-800` belong in alias definitions. App rules live in the other files under `styles/`; shadcn controls use the same tokens. Plus Jakarta Sans is self-hosted through npm.

## UI conventions

- Use plain NZ English, sentence case and correct te reo Māori macrons. Show common names first, with botanical names in italics where appropriate.
- Label actions with verbs and objects. Explain quantities and consequences instead of exposing internal codes.
- Use warm stone backgrounds, white cards, deep green primary actions and soft status fills. Reserve lime for ready-to-plant states on dark green.
- Keep backgrounds flat. Use real plant/site photographs with attribution. Cards have fine borders; shadows belong to floating panels, popovers and dialogs.
- Use token-based rounded controls and containers. Preserve visible focus, error and disabled states.
- The original Canopy components are text-first. This app also uses Lucide icons; reuse existing icon patterns and label icon-only controls accessibly.
- Format numbers with grouping (`7,020`) and dates clearly (`Wed 7 Oct 2026`). Preserve real container codes and reference identifiers when needed.

The prototype includes nursery planning patterns beyond the current history explorer. Reuse its visual tokens without implying those workflows are implemented.
