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
