<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Screenshots in pull requests

Any PR that changes what someone sees includes screenshots. Take them yourself, so
the people reviewing or reusing the work can see what's there without reading the code.

- Show each screen or state you changed, on desktop (1280px wide) and phone (390px).
- If the PR adds or changes a shared part (`components/ui`, `components/forms`), add one
  sheet with each part in its own card: its name, one line on what it's for, and its real
  states (filled, empty, with a hint, with an error, turned off). Use labels from our real
  forms. Build the sheet on a temporary page and delete it before committing.
- Upload the images through the GitHub comment box and put them in a table in the PR
  description.
- If nothing visual changed, write "Not applicable: no visual change."

## Form input validation

When adding or changing forms, reuse the string limits in `lib/forms/limits.ts`:

| Kind | Maximum length |
|---|---|
| Slugs and identifiers | 80 |
| Names, short text and photo attribution | 255 |
| URLs | 2,048 |
| Notes and long text | 2,000 |

Enforce limits in server-side Zod schemas and reuse those schemas in client forms. Set matching
HTML `maxLength` attributes on text inputs and textareas. Reject overlong submitted values with
clear field errors; do not silently truncate stored input. Unwrap nullable server fields for form
schemas instead of replacing them with unbounded strings. Test values at the limit and one character over.

These shared limits currently apply to the species create/edit form. Apply the convention to other
forms when they are updated; do not expand a task's scope solely to migrate every existing form.
The PostgreSQL species columns remain `text` without explicit length constraints; do not assume
the database enforces these application limits.
